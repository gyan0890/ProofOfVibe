use starknet::ContractAddress;

#[starknet::interface]
pub trait ISeasonClock<TContractState> {
    fn trigger_mass_reveal(ref self: TContractState);
    fn publish_salt_key(ref self: TContractState, cid: felt252);
    fn get_time_remaining(self: @TContractState) -> u64;
    fn season_end(self: @TContractState) -> u64;
    fn salt_key_cid(self: @TContractState) -> felt252;
    fn mass_reveal_triggered(self: @TContractState) -> bool;
}

#[starknet::contract]
pub mod SeasonClock {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        season_end: u64,
        vibecard_contract: ContractAddress,
        owner: ContractAddress,
        mass_reveal_triggered: bool,
        salt_decryption_key_cid: felt252,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        MassRevealTriggered: MassRevealTriggered,
        SaltKeyPublished: SaltKeyPublished,
    }

    #[derive(Drop, starknet::Event)]
    struct MassRevealTriggered {
        timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct SaltKeyPublished {
        cid: felt252,
        timestamp: u64,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        season_end: u64,
        vibecard: ContractAddress,
        owner: ContractAddress,
    ) {
        self.season_end.write(season_end);
        self.vibecard_contract.write(vibecard);
        self.owner.write(owner);
        self.mass_reveal_triggered.write(false);
        self.salt_decryption_key_cid.write(0);
    }

    #[abi(embed_v0)]
    impl SeasonClockImpl of super::ISeasonClock<ContractState> {
        fn trigger_mass_reveal(ref self: ContractState) {
            let now = get_block_timestamp();
            assert(now >= self.season_end.read(), 'Season not ended');
            assert(!self.mass_reveal_triggered.read(), 'Already triggered');
            self.mass_reveal_triggered.write(true);
            self.emit(MassRevealTriggered { timestamp: now });
            // Off-chain script reads this event and calls force_reveal for all cards
        }

        fn publish_salt_key(ref self: ContractState, cid: felt252) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Not owner');
            let now = get_block_timestamp();
            assert(now >= self.season_end.read(), 'Season not ended');
            self.salt_decryption_key_cid.write(cid);
            self.emit(SaltKeyPublished { cid, timestamp: now });
        }

        fn get_time_remaining(self: @ContractState) -> u64 {
            let now = get_block_timestamp();
            let end = self.season_end.read();
            if now >= end { 0_u64 } else { end - now }
        }

        fn season_end(self: @ContractState) -> u64 {
            self.season_end.read()
        }

        fn salt_key_cid(self: @ContractState) -> felt252 {
            self.salt_decryption_key_cid.read()
        }

        fn mass_reveal_triggered(self: @ContractState) -> bool {
            self.mass_reveal_triggered.read()
        }
    }
}
