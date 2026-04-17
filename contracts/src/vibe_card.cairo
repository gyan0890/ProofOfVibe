use starknet::ContractAddress;

#[derive(Drop, Serde, starknet::Store)]
pub struct CardData {
    pub owner: ContractAddress,
    pub commitment: felt252,
    pub ipfs_cid: felt252,
    pub revealed_type: u8,      // 255 = not revealed
    pub palette_revealed: bool,
    pub mint_timestamp: u64,
    pub persona_name: felt252,
}

#[derive(Drop, Serde, starknet::Store)]
pub struct TraitRevealState {
    pub trait_1_word: felt252,   // 0 = not revealed
    pub trait_2_word: felt252,   // 0 = not revealed
    pub bar_fills_accurate: bool,
    pub palette_revealed: bool,
    pub type_revealed: bool,
}

#[derive(Drop, Serde, starknet::Store)]
pub struct BattleData {
    pub challenger_token: u256,
    pub defender_token: u256,
    pub challenger_commitment: felt252,
    pub defender_commitment: felt252,
    pub challenger_activity_score: u32,
    pub defender_activity_score: u32,
    pub status: u8,  // 0=Pending, 1=DefenderCommitted, 2=Resolved, 3=Expired
    pub winner: u256,  // 0 = none
    pub initiated_at: u64,
}

#[starknet::interface]
pub trait IVibeCard<TContractState> {
    fn mint(
        ref self: TContractState,
        commitment: felt252,
        ipfs_cid: felt252,
        persona_name: felt252,
    ) -> u256;

    fn initiate_battle(
        ref self: TContractState,
        challenger_token: u256,
        defender_token: u256,
        move_commitment: felt252,
        activity_score: u32,
    ) -> u256;

    fn submit_defense(
        ref self: TContractState,
        battle_id: u256,
        move_commitment: felt252,
        activity_score: u32,
    );

    fn resolve_battle(
        ref self: TContractState,
        battle_id: u256,
        challenger_move: u8,
        challenger_nonce: felt252,
        defender_move: u8,
        defender_nonce: felt252,
    );

    fn claim_expired_battle(ref self: TContractState, battle_id: u256);

    fn owner_reveal(
        ref self: TContractState,
        token_id: u256,
        vibe_type: u8,
        salt: felt252,
    );

    fn force_reveal(
        ref self: TContractState,
        token_id: u256,
        vibe_type: u8,
        salt: felt252,
    );

    fn submit_guess(
        ref self: TContractState,
        token_id: u256,
        guessed_type: u8,
    );

    fn get_card(self: @TContractState, token_id: u256) -> CardData;
    fn get_battle(self: @TContractState, battle_id: u256) -> BattleData;
    fn get_trait_state(self: @TContractState, token_id: u256) -> TraitRevealState;
    fn get_battle_losses(self: @TContractState, token_id: u256) -> u8;
    fn token_counter(self: @TContractState) -> u256;
}

// Battle affinity matrix
// Returns true if type_a beats type_b
fn affinity_beats(type_a: u8, type_b: u8) -> bool {
    // Architect(0) > Degen(1) > Socialite(5) > Oracle(6) > Ghost(2) > Architect cycle
    // Builder(3) > Ghost(2), WhaleHunter(4) > Builder(3), Degen(1) > WhaleHunter(4)
    if type_a == 0 && type_b == 1 { return true; }
    if type_a == 1 && type_b == 5 { return true; }
    if type_a == 5 && type_b == 6 { return true; }
    if type_a == 6 && type_b == 2 { return true; }
    if type_a == 2 && type_b == 0 { return true; }
    if type_a == 3 && type_b == 2 { return true; }
    if type_a == 4 && type_b == 3 { return true; }
    if type_a == 1 && type_b == 4 { return true; }
    false
}

#[starknet::contract]
pub mod VibeCard {
    use super::{CardData, TraitRevealState, BattleData, affinity_beats};
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess,
        Map, StorageMapReadAccess, StorageMapWriteAccess,
    };

    const BATTLE_EXPIRY: u64 = 3600_u64;
    const UNREVEALED: u8 = 255_u8;

    #[storage]
    struct Storage {
        cards: Map<u256, CardData>,
        battle_losses: Map<u256, u8>,
        revealed_traits: Map<u256, TraitRevealState>,
        battles: Map<u256, BattleData>,
        battle_counter: u256,
        token_counter: u256,
        season_end_timestamp: u64,
        season_clock_address: ContractAddress,
        // nullifier: (token_id, guesser) -> guessed_type+1 (0=unguessed)
        guess_nullifier: Map<(u256, ContractAddress), u8>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        CardMinted: CardMinted,
        BattleInitiated: BattleInitiated,
        BattleResolved: BattleResolved,
        TraitRevealed: TraitRevealed,
        CardRevealed: CardRevealed,
    }

    #[derive(Drop, starknet::Event)]
    struct CardMinted {
        #[key] token_id: u256,
        owner: ContractAddress,
        persona_name: felt252,
        timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct BattleInitiated {
        #[key] battle_id: u256,
        challenger: u256,
        defender: u256,
        timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct BattleResolved {
        #[key] battle_id: u256,
        winner_token: u256,
        loser_token: u256,
        traits_exposed: u8,
    }

    #[derive(Drop, starknet::Event)]
    struct TraitRevealed {
        #[key] token_id: u256,
        reveal_level: u8,
    }

    #[derive(Drop, starknet::Event)]
    struct CardRevealed {
        #[key] token_id: u256,
        vibe_type: u8,
        reveal_source: felt252,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        season_end: u64,
        season_clock: ContractAddress,
    ) {
        self.season_end_timestamp.write(season_end);
        self.season_clock_address.write(season_clock);
        self.token_counter.write(0_u256);
        self.battle_counter.write(0_u256);
    }

    #[abi(embed_v0)]
    impl VibeCardImpl of super::IVibeCard<ContractState> {
        fn mint(
            ref self: ContractState,
            commitment: felt252,
            ipfs_cid: felt252,
            persona_name: felt252,
        ) -> u256 {
            let caller = get_caller_address();
            let token_id = self.token_counter.read() + 1_u256;
            self.token_counter.write(token_id);

            let card = CardData {
                owner: caller,
                commitment,
                ipfs_cid,
                revealed_type: 255_u8,
                palette_revealed: false,
                mint_timestamp: get_block_timestamp(),
                persona_name,
            };
            self.cards.write(token_id, card);

            let trait_state = TraitRevealState {
                trait_1_word: 0,
                trait_2_word: 0,
                bar_fills_accurate: false,
                palette_revealed: false,
                type_revealed: false,
            };
            self.revealed_traits.write(token_id, trait_state);
            self.battle_losses.write(token_id, 0_u8);

            self.emit(CardMinted {
                token_id,
                owner: caller,
                persona_name,
                timestamp: get_block_timestamp(),
            });

            token_id
        }

        fn initiate_battle(
            ref self: ContractState,
            challenger_token: u256,
            defender_token: u256,
            move_commitment: felt252,
            activity_score: u32,
        ) -> u256 {
            let caller = get_caller_address();
            let card = self.cards.read(challenger_token);
            assert(card.owner == caller, 'Not token owner');
            assert(challenger_token != defender_token, 'Cannot battle self');

            let battle_id = self.battle_counter.read() + 1_u256;
            self.battle_counter.write(battle_id);

            let battle = BattleData {
                challenger_token,
                defender_token,
                challenger_commitment: move_commitment,
                defender_commitment: 0,
                challenger_activity_score: activity_score,
                defender_activity_score: 0_u32,
                status: 0_u8,
                winner: 0_u256,
                initiated_at: get_block_timestamp(),
            };
            self.battles.write(battle_id, battle);

            self.emit(BattleInitiated {
                battle_id,
                challenger: challenger_token,
                defender: defender_token,
                timestamp: get_block_timestamp(),
            });

            battle_id
        }

        fn submit_defense(
            ref self: ContractState,
            battle_id: u256,
            move_commitment: felt252,
            activity_score: u32,
        ) {
            let caller = get_caller_address();
            let mut battle = self.battles.read(battle_id);
            assert(battle.status == 0_u8, 'Battle not pending');

            let defender_card = self.cards.read(battle.defender_token);
            assert(defender_card.owner == caller, 'Not defender');

            battle.defender_commitment = move_commitment;
            battle.defender_activity_score = activity_score;
            battle.status = 1_u8; // DefenderCommitted
            self.battles.write(battle_id, battle);
        }

        fn resolve_battle(
            ref self: ContractState,
            battle_id: u256,
            challenger_move: u8,
            challenger_nonce: felt252,
            defender_move: u8,
            defender_nonce: felt252,
        ) {
            let mut battle = self.battles.read(battle_id);
            assert(battle.status == 1_u8, 'Not ready to resolve');

            // Verify challenger commitment: hash(move + nonce)
            // In production use pedersen or poseidon hash
            // For MVP we trust the caller; production adds proper verification
            let _ = challenger_nonce;
            let _ = defender_nonce;

            // Determine winner using affinity matrix
            let challenger_card = self.cards.read(battle.challenger_token);
            let defender_card = self.cards.read(battle.defender_token);

            let c_type = challenger_card.revealed_type;
            let d_type = defender_card.revealed_type;

            let challenger_wins = if c_type != 255_u8 && d_type != 255_u8 {
                if affinity_beats(c_type, d_type) {
                    true
                } else if affinity_beats(d_type, c_type) {
                    false
                } else {
                    battle.challenger_activity_score >= battle.defender_activity_score
                }
            } else {
                // Move-based resolution when types hidden
                // Higher move index beats lower (simplified)
                challenger_move > defender_move
            };

            let (winner, loser) = if challenger_wins {
                (battle.challenger_token, battle.defender_token)
            } else {
                (battle.defender_token, battle.challenger_token)
            };

            battle.status = 2_u8;
            battle.winner = winner;
            self.battles.write(battle_id, battle);

            // Apply trait exposure to loser
            let traits_exposed = self._apply_trait_exposure(loser);

            self.emit(BattleResolved {
                battle_id,
                winner_token: winner,
                loser_token: loser,
                traits_exposed,
            });
        }

        fn claim_expired_battle(ref self: ContractState, battle_id: u256) {
            let mut battle = self.battles.read(battle_id);
            assert(battle.status == 0_u8, 'Battle not pending');
            let now = get_block_timestamp();
            assert(now >= battle.initiated_at + BATTLE_EXPIRY, 'Not expired yet');

            battle.status = 3_u8; // Expired
            battle.winner = battle.challenger_token;
            self.battles.write(battle_id, battle);
        }

        fn owner_reveal(
            ref self: ContractState,
            token_id: u256,
            vibe_type: u8,
            salt: felt252,
        ) {
            let caller = get_caller_address();
            let card = self.cards.read(token_id);
            assert(card.owner == caller, 'Not owner');
            self._do_reveal(token_id, vibe_type, salt, 'owner');
        }

        fn force_reveal(
            ref self: ContractState,
            token_id: u256,
            vibe_type: u8,
            salt: felt252,
        ) {
            let caller = get_caller_address();
            let season_clock = self.season_clock_address.read();
            // Only season clock can force reveal
            assert(caller == season_clock, 'Not season clock');
            self._do_reveal(token_id, vibe_type, salt, 'season_end');
        }

        fn submit_guess(
            ref self: ContractState,
            token_id: u256,
            guessed_type: u8,
        ) {
            let caller = get_caller_address();
            assert(guessed_type < 7_u8, 'Invalid type');
            let existing = self.guess_nullifier.read((token_id, caller));
            assert(existing == 0_u8, 'Already guessed');
            self.guess_nullifier.write((token_id, caller), guessed_type + 1_u8);
        }

        fn get_card(self: @ContractState, token_id: u256) -> CardData {
            self.cards.read(token_id)
        }

        fn get_battle(self: @ContractState, battle_id: u256) -> BattleData {
            self.battles.read(battle_id)
        }

        fn get_trait_state(self: @ContractState, token_id: u256) -> TraitRevealState {
            self.revealed_traits.read(token_id)
        }

        fn get_battle_losses(self: @ContractState, token_id: u256) -> u8 {
            self.battle_losses.read(token_id)
        }

        fn token_counter(self: @ContractState) -> u256 {
            self.token_counter.read()
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _apply_trait_exposure(ref self: ContractState, token_id: u256) -> u8 {
            let losses = self.battle_losses.read(token_id) + 1_u8;
            self.battle_losses.write(token_id, losses);

            let mut state = self.revealed_traits.read(token_id);

            // Step 1 — first identity hint leaks
            if losses >= 1_u8 && state.trait_1_word == 0 {
                state.trait_1_word = 'trait_1'; // oracle sets actual word
                self.emit(TraitRevealed { token_id, reveal_level: 1_u8 });
            }
            // Step 2 — second hint + privacy bars become accurate
            if losses >= 2_u8 && state.trait_2_word == 0 {
                state.trait_2_word = 'trait_2';
                self.emit(TraitRevealed { token_id, reveal_level: 2_u8 });
            }
            if losses >= 2_u8 && !state.bar_fills_accurate {
                state.bar_fills_accurate = true;
                self.emit(TraitRevealed { token_id, reveal_level: 3_u8 });
            }
            // Step 3 — card colour palette revealed (big visual reveal)
            if losses >= 3_u8 && !state.palette_revealed {
                state.palette_revealed = true;
                self.emit(TraitRevealed { token_id, reveal_level: 4_u8 });
            }

            self.revealed_traits.write(token_id, state);

            if losses >= 5_u8 {
                // Full auto-reveal — requires salt from IPFS
                // Emit event for oracle to trigger reveal
                self.emit(TraitRevealed { token_id, reveal_level: 8_u8 });
            }

            losses
        }

        fn _do_reveal(
            ref self: ContractState,
            token_id: u256,
            vibe_type: u8,
            salt: felt252,
            source: felt252,
        ) {
            let mut card = self.cards.read(token_id);
            assert(card.revealed_type == 255_u8, 'Already revealed');
            assert(vibe_type < 7_u8, 'Invalid type');

            // Verify commitment: keccak(owner + vibe_type + salt)
            // Production: use proper keccak256 here
            // For MVP: trust the caller provides correct values
            let _ = salt;

            card.revealed_type = vibe_type;
            card.palette_revealed = true;
            self.cards.write(token_id, card);

            let mut state = self.revealed_traits.read(token_id);
            state.palette_revealed = true;
            state.type_revealed = true;
            self.revealed_traits.write(token_id, state);

            self.emit(CardRevealed { token_id, vibe_type, reveal_source: source });
        }
    }
}
