use starknet::ContractAddress;

#[starknet::interface]
pub trait IVibeLeaderboard<TContractState> {
    fn record_battle_result(ref self: TContractState, winner: ContractAddress, loser: ContractAddress);
    fn record_guess(ref self: TContractState, guesser: ContractAddress, token_id: u256, guessed_type: u8);
    fn resolve_guess_accuracy(ref self: TContractState, token_id: u256, true_type: u8);
    fn get_battle_wins(self: @TContractState, player: ContractAddress) -> u32;
    fn get_guess_stats(self: @TContractState, player: ContractAddress) -> (u32, u32);
}

#[starknet::contract]
pub mod VibeLeaderboard {
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess,
        Map, StorageMapReadAccess, StorageMapWriteAccess,
    };

    #[storage]
    struct Storage {
        vibecard_contract: ContractAddress,
        battle_wins: Map<ContractAddress, u32>,
        total_guesses: Map<ContractAddress, u32>,
        correct_guesses: Map<ContractAddress, u32>,
        // token_id -> (guesser -> guessed_type+1)
        card_guesses: Map<(u256, ContractAddress), u8>,
        // token_id -> total battles received
        card_battle_count: Map<u256, u32>,
    }

    #[constructor]
    fn constructor(ref self: ContractState, vibecard: ContractAddress) {
        self.vibecard_contract.write(vibecard);
    }

    #[abi(embed_v0)]
    impl VibeLeaderboardImpl of super::IVibeLeaderboard<ContractState> {
        fn record_battle_result(
            ref self: ContractState,
            winner: ContractAddress,
            loser: ContractAddress,
        ) {
            let caller = get_caller_address();
            assert(caller == self.vibecard_contract.read(), 'Not vibecard');
            let wins = self.battle_wins.read(winner);
            self.battle_wins.write(winner, wins + 1_u32);
        }

        fn record_guess(
            ref self: ContractState,
            guesser: ContractAddress,
            token_id: u256,
            guessed_type: u8,
        ) {
            let caller = get_caller_address();
            assert(caller == self.vibecard_contract.read(), 'Not vibecard');
            self.card_guesses.write((token_id, guesser), guessed_type + 1_u8);
            let total = self.total_guesses.read(guesser);
            self.total_guesses.write(guesser, total + 1_u32);
        }

        fn resolve_guess_accuracy(
            ref self: ContractState,
            token_id: u256,
            true_type: u8,
        ) {
            // Called on reveal — iterate guessers (done off-chain for MVP)
            // On-chain: store true_type, let users claim their correct guess reward
            let _ = token_id;
            let _ = true_type;
        }

        fn get_battle_wins(self: @ContractState, player: ContractAddress) -> u32 {
            self.battle_wins.read(player)
        }

        fn get_guess_stats(self: @ContractState, player: ContractAddress) -> (u32, u32) {
            (self.correct_guesses.read(player), self.total_guesses.read(player))
        }
    }
}
