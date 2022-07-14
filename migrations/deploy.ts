// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

import {PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY} from "@solana/web3.js";
import {TOKEN_PROGRAM_ID} from "@solana/spl-token";

import * as anchor from "@project-serum/anchor";

module.exports = async function (provider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);

  anchor.setProvider(provider);
  const program = anchor.workspace.ChicksStakingLocked;

  const STAKING_PDA_SEED_V2: string = "staking_v2";
  const STAKING_PDA_SEED_V3: string = "staking_v3";
  const USER_STAKING_PDA_SEED_V3: string = "user_staking_v3";

  let isDevnet = true;
  if (program.programId.equals(new PublicKey('GSA6YFJHtnPFKZUXjVH9uAQdJaPt3bWADDfbeduq9edJ'))) {
    isDevnet = false;
  }
  console.log(`Migration on ${isDevnet? 'Devnet':'Mainnet'}`);

  const mintPubkey = new PublicKey(isDevnet? 'FUnRfJAJiTtpSGP9uP5RtFm4QPsYUPTVgSMoYrgVyNzQ':'cxxShYRVcepDudXhe7U62QHvw8uBJoKFifmzggGKVC2');

  let lock_unit: anchor.BN = new anchor.BN(86400);
  const pools = [30, 45, 60];

  const migrate_v3 = async (pool_index, reward_rate) => {
    const pool_handle = `pool${pool_index + 1}`;

    console.log(`${pool_handle}: ${reward_rate}`);
    const [stakingV2Pubkey, stakingV2Bump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(STAKING_PDA_SEED_V2), Buffer.from(pool_handle)],
        program.programId
      );
    const [stakingV3Pubkey, stakingV3Bump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          mintPubkey.toBuffer(),
          Buffer.from(STAKING_PDA_SEED_V3),
          Buffer.from(pool_handle)
        ],
        program.programId
      );
    let bnRewardRate: anchor.BN = new anchor.BN(reward_rate * 100); // 30%

    const txId = await program.methods
      .migrateV3(
        stakingV2Bump,
        stakingV3Bump,
        pool_handle,
        bnRewardRate,
        lock_unit
      )
      .accounts({
        initializer: provider.wallet.publicKey,
        tokenMint: mintPubkey,
        stakingAccountV2: stakingV2Pubkey,
        stakingAccountV3: stakingV3Pubkey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    console.log(`txId: ${txId}`);
  }

  for(let i = 0; i < pools.length; i++) {
    await migrate_v3(i, pools[i]);
  }

};
