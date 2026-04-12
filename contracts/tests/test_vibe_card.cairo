use proof_of_vibe::vibe_card::{IVibeCardDispatcher, IVibeCardDispatcherTrait};
use starknet::ContractAddress;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address, stop_cheat_caller_address, start_cheat_block_timestamp, stop_cheat_block_timestamp};

fn OWNER() -> ContractAddress { starknet::contract_address_const::<0x1>() }
fn PLAYER2() -> ContractAddress { starknet::contract_address_const::<0x2>() }
fn SEASON_CLOCK() -> ContractAddress { starknet::contract_address_const::<0x3>() }

fn deploy_vibecard() -> IVibeCardDispatcher {
    let contract = declare("VibeCard").unwrap().contract_class();
    let season_end: u64 = 9999999999_u64;
    let mut calldata = array![];
    season_end.serialize(ref calldata);
    SEASON_CLOCK().serialize(ref calldata);
    let (address, _) = contract.deploy(@calldata).unwrap();
    IVibeCardDispatcher { contract_address: address }
}

#[test]
fn test_mint() {
    let contract = deploy_vibecard();
    start_cheat_caller_address(contract.contract_address, OWNER());
    let token_id = contract.mint(0x1234, 0x5678, 'Mystery Wanderer #1');
    assert(token_id == 1_u256, 'Wrong token id');
    let card = contract.get_card(token_id);
    assert(card.owner == OWNER(), 'Wrong owner');
    assert(card.commitment == 0x1234, 'Wrong commitment');
    assert(card.revealed_type == 255_u8, 'Should be hidden');
    stop_cheat_caller_address(contract.contract_address);
}

#[test]
fn test_battle_lifecycle() {
    let contract = deploy_vibecard();

    start_cheat_caller_address(contract.contract_address, OWNER());
    let token_1 = contract.mint(0x1111, 0x2222, 'Card One');
    stop_cheat_caller_address(contract.contract_address);

    start_cheat_caller_address(contract.contract_address, PLAYER2());
    let token_2 = contract.mint(0x3333, 0x4444, 'Card Two');
    stop_cheat_caller_address(contract.contract_address);

    // Initiate battle
    start_cheat_caller_address(contract.contract_address, OWNER());
    let battle_id = contract.initiate_battle(token_1, token_2, 0xabc, 100_u32);
    stop_cheat_caller_address(contract.contract_address);
    assert(battle_id == 1_u256, 'Wrong battle id');

    // Submit defense
    start_cheat_caller_address(contract.contract_address, PLAYER2());
    contract.submit_defense(battle_id, 0xdef, 80_u32);
    stop_cheat_caller_address(contract.contract_address);

    let battle = contract.get_battle(battle_id);
    assert(battle.status == 1_u8, 'Should be DefenderCommitted');

    // Resolve
    start_cheat_caller_address(contract.contract_address, OWNER());
    contract.resolve_battle(battle_id, 2_u8, 0xaaa, 1_u8, 0xbbb);
    stop_cheat_caller_address(contract.contract_address);

    let resolved = contract.get_battle(battle_id);
    assert(resolved.status == 2_u8, 'Should be Resolved');
}

#[test]
fn test_trait_exposure_progression() {
    let contract = deploy_vibecard();

    start_cheat_caller_address(contract.contract_address, OWNER());
    let token_1 = contract.mint(0x1111, 0x2222, 'Card One');
    stop_cheat_caller_address(contract.contract_address);

    start_cheat_caller_address(contract.contract_address, PLAYER2());
    let token_2 = contract.mint(0x3333, 0x4444, 'Card Two');
    stop_cheat_caller_address(contract.contract_address);

    // Force 3 losses on token_2 (card with higher activity score wins)
    let mut i: u32 = 0;
    loop {
        if i >= 3 { break; }
        start_cheat_caller_address(contract.contract_address, OWNER());
        let battle_id = contract.initiate_battle(token_1, token_2, 0xabc, 1000_u32);
        stop_cheat_caller_address(contract.contract_address);
        start_cheat_caller_address(contract.contract_address, PLAYER2());
        contract.submit_defense(battle_id, 0xdef, 1_u32);
        stop_cheat_caller_address(contract.contract_address);
        start_cheat_caller_address(contract.contract_address, OWNER());
        contract.resolve_battle(battle_id, 2_u8, 0xaaa, 1_u8, 0xbbb);
        stop_cheat_caller_address(contract.contract_address);
        i += 1;
    };

    let losses = contract.get_battle_losses(token_2);
    assert(losses == 3_u8, 'Should have 3 losses');

    let state = contract.get_trait_state(token_2);
    assert(state.bar_fills_accurate, 'Bars should be accurate at 3');
}

#[test]
fn test_owner_reveal() {
    let contract = deploy_vibecard();
    start_cheat_caller_address(contract.contract_address, OWNER());
    let token_id = contract.mint(0xcommitment, 0xcid, 'My Card');
    contract.owner_reveal(token_id, 2_u8, 0xsalt);
    let card = contract.get_card(token_id);
    assert(card.revealed_type == 2_u8, 'Wrong type');
    stop_cheat_caller_address(contract.contract_address);
}

#[test]
fn test_force_reveal_only_season_clock() {
    let contract = deploy_vibecard();
    start_cheat_caller_address(contract.contract_address, OWNER());
    let token_id = contract.mint(0xcommitment, 0xcid, 'My Card');
    stop_cheat_caller_address(contract.contract_address);

    // Force reveal from season clock
    start_cheat_caller_address(contract.contract_address, SEASON_CLOCK());
    contract.force_reveal(token_id, 0_u8, 0xsalt);
    stop_cheat_caller_address(contract.contract_address);

    let card = contract.get_card(token_id);
    assert(card.revealed_type == 0_u8, 'Should be revealed');
}

#[test]
#[should_panic(expected: ('Not season clock',))]
fn test_force_reveal_rejects_non_clock() {
    let contract = deploy_vibecard();
    start_cheat_caller_address(contract.contract_address, OWNER());
    let token_id = contract.mint(0xcommitment, 0xcid, 'My Card');
    contract.force_reveal(token_id, 0_u8, 0xsalt);
    stop_cheat_caller_address(contract.contract_address);
}
