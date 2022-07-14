import {clusterApiUrl, Connection, Keypair, PublicKey, Signer} from "@solana/web3.js";
import {ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID, u64} from "@solana/spl-token";
import {program} from 'commander';
import fs from "fs";
import {AnchorProvider, Program} from '@project-serum/anchor';
import {getAssocTokenAddress, loadWalletKey, toPublicKey} from "./solana";
import {IDL, ChicksStakingLocked} from './idl/chicks_staking_locked';
import * as anchor from "@project-serum/anchor";

program.version('0.0.1');

const PROGRAM_ID_DEV = 'AVauy78yvW2K6QUfUSfPtcxPEaT3V6W1xwGEQQSFDAPC';
const PROGRAM_ID = 'GSA6YFJHtnPFKZUXjVH9uAQdJaPt3bWADDfbeduq9edJ';

const CHICKS_TOKEN_ADDRESS = 'cxxShYRVcepDudXhe7U62QHvw8uBJoKFifmzggGKVC2';

const STAKING_PDA_SEED_V2: string = "staking_v2";
const STAKING_PDA_SEED_V3: string = "staking_v3";
const USER_STAKING_PDA_SEED_V3: string = "user_staking_v3";

let vaultPubKey: anchor.web3.PublicKey;
let vaultBump: number;
let stakingV2Pubkey: anchor.web3.PublicKey;
let stakingV2Bump: number;
let stakingV3Pubkey: anchor.web3.PublicKey;
let stakingV3Bump: number;

program
  .command('create-staking-v3')
  .requiredOption('-k, --keypair <path>', `Solana wallet location`)
  .option(
    '-e, --env <string>',
    'Solana cluster env name. One of: mainnet-beta, testnet, devnet',
    'mainnet-beta',
  )
  .requiredOption('-h --handle <string>', 'Staking handle')
  .requiredOption('--apr <number>', 'Reward rate e.g.) 30')
  .requiredOption('--lock <number>', 'Lock time in days. e.g.) 120 for 4 months')
  .requiredOption('--interval <number>', 'Vesting interval in seconds e.g.) 86400 for 1 day', `86400`)
  .requiredOption('-t --token <string>', 'Token address', CHICKS_TOKEN_ADDRESS)
  .action(async (_directory: any, cmd: any) => {
    const {
      keypair,
      env,
      handle,
      apr,
      lock,
      interval,
      token,
    } = cmd.opts();

    const serviceKeypair = loadWalletKey(keypair);
    const provideOptions = AnchorProvider.defaultOptions();
    const connection = new Connection(
      clusterApiUrl(env),
      provideOptions.commitment,
    );

    const walletWrapper = new anchor.Wallet(serviceKeypair);
    const provider = new AnchorProvider(connection, walletWrapper, {
      preflightCommitment: 'recent',
    });
    const isDev = env != 'mainnet-beta';
    const programId = new PublicKey(isDev? PROGRAM_ID_DEV:PROGRAM_ID);
    const program = new Program<ChicksStakingLocked>(
      IDL,
      programId,
      provider,
    );
    const pool_handle = (handle as string).trim();
    const mintPubkey = toPublicKey(token);
    const reward_rate = Number(apr) * 100;
    const lock_time = lock < 10000? lock * 86400:lock;
    const vesting_interval = interval;

    [vaultPubKey, vaultBump] = await anchor.web3.PublicKey.findProgramAddress(
      [mintPubkey.toBuffer(), Buffer.from(pool_handle)],
      program.programId
    );

    [stakingV3Pubkey, stakingV3Bump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          mintPubkey.toBuffer(),
          Buffer.from(STAKING_PDA_SEED_V3),
          Buffer.from(pool_handle)
        ],
        program.programId
      );

    await program.methods
      .initialize(
        vaultBump,
        stakingV3Bump,
        pool_handle,
        new anchor.BN(reward_rate),
        new anchor.BN(lock_time),
        new anchor.BN(vesting_interval)
      )
      .accounts({
        tokenMint: mintPubkey,
        tokenVault: vaultPubKey,
        stakingAccountV3: stakingV3Pubkey,
        initializer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
  });

program
  .command('migrate-v3')
  .requiredOption('-k, --keypair <path>', `Solana wallet location`)
  .option(
    '-e, --env <string>',
    'Solana cluster env name. One of: mainnet-beta, testnet, devnet',
    'mainnet-beta',
  )
  .requiredOption('-h --handle <string>', 'Staking handle')
  .requiredOption('--apr <number>', 'Reward rate e.g.) 30')
  .requiredOption('--interval <number>', 'Vesting interval in seconds e.g.) 86400 for 1 day', `86400`)
  .requiredOption('-t --token <string>', 'Token address', CHICKS_TOKEN_ADDRESS)
  .action(async (_directory: any, cmd: any) => {
    const {
      keypair,
      env,
      handle,
      apr,
      interval,
      token,
    } = cmd.opts();

    const serviceKeypair = loadWalletKey(keypair);
    const provideOptions = AnchorProvider.defaultOptions();
    const connection = new Connection(
      clusterApiUrl(env),
      provideOptions.commitment,
    );

    const walletWrapper = new anchor.Wallet(serviceKeypair);
    const provider = new AnchorProvider(connection, walletWrapper, {
      preflightCommitment: 'recent',
    });
    const isDev = env != 'mainnet-beta';
    const programId = new PublicKey(isDev? PROGRAM_ID_DEV:PROGRAM_ID);
    const program = new Program<ChicksStakingLocked>(
      IDL,
      programId,
      provider,
    );
    const pool_handle = (handle as string).trim();
    const mintPubkey = toPublicKey(token);
    const reward_rate = Number(apr) * 100;
    const vesting_interval = interval;

    [vaultPubKey, vaultBump] = await anchor.web3.PublicKey.findProgramAddress(
      [mintPubkey.toBuffer(), Buffer.from(pool_handle)],
      program.programId
    );

    [stakingV3Pubkey, stakingV3Bump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          mintPubkey.toBuffer(),
          Buffer.from(STAKING_PDA_SEED_V3),
          Buffer.from(pool_handle)
        ],
        program.programId
      );

    [stakingV2Pubkey, stakingV2Bump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(STAKING_PDA_SEED_V2), Buffer.from(pool_handle)],
        program.programId
      );

    await program.methods
      .migrateV3(
        stakingV2Bump,
        stakingV3Bump,
        pool_handle,
        new anchor.BN(reward_rate),
        new anchor.BN(vesting_interval)
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
  });

program
  .command('migrate-all')
  .requiredOption('-k, --keypair <path>', `Solana wallet location`)
  .option(
    '-e, --env <string>',
    'Solana cluster env name. One of: mainnet-beta, testnet, devnet',
    'mainnet-beta',
  )
  .action(async (_directory: any, cmd: any) => {
    const {
      keypair,
      env,
    } = cmd.opts();

    const serviceKeypair = loadWalletKey(keypair);
    const provideOptions = AnchorProvider.defaultOptions();
    const connection = new Connection(
      clusterApiUrl(env),
      provideOptions.commitment,
    );

    const walletWrapper = new anchor.Wallet(serviceKeypair);
    const provider = new AnchorProvider(connection, walletWrapper, {
      preflightCommitment: 'recent',
    });
    const isDev = env != 'mainnet-beta';
    const programId = new PublicKey(isDev? PROGRAM_ID_DEV:PROGRAM_ID);
    const program = new Program<ChicksStakingLocked>(
      IDL,
      programId,
      provider,
    );
    const mintPubkey = new PublicKey(isDev? 'FUnRfJAJiTtpSGP9uP5RtFm4QPsYUPTVgSMoYrgVyNzQ':'cxxShYRVcepDudXhe7U62QHvw8uBJoKFifmzggGKVC2');

    let unlock_interval: anchor.BN = new anchor.BN(86400);
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
          unlock_interval
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
  });

program
  .command('update-config')
  .requiredOption('-k, --keypair <path>', `Solana wallet location`)
  .option(
    '-e, --env <string>',
    'Solana cluster env name. One of: mainnet-beta, testnet, devnet',
    'mainnet-beta',
  )
  .requiredOption('-h --handle <string>', 'Staking handle')
  .requiredOption('--lock <number>', 'Lock time in days. e.g.) 120 for 4 months')
  .requiredOption('--apr <number>', 'Reward rate e.g.) 30')
  .requiredOption('--interval <number>', 'Vesting interval in seconds e.g.) 86400 for 1 day', `86400`)
  .requiredOption('-t --token <string>', 'Token address', CHICKS_TOKEN_ADDRESS)
  .action(async (_directory: any, cmd: any) => {
    const {
      keypair,
      env,
      handle,
      apr,
      lock,
      interval,
      token,
    } = cmd.opts();

    const serviceKeypair = loadWalletKey(keypair);
    const provideOptions = AnchorProvider.defaultOptions();
    const connection = new Connection(
      clusterApiUrl(env),
      provideOptions.commitment,
    );

    const walletWrapper = new anchor.Wallet(serviceKeypair);
    const provider = new AnchorProvider(connection, walletWrapper, {
      preflightCommitment: 'recent',
    });
    const isDev = env != 'mainnet-beta';
    const programId = new PublicKey(isDev? PROGRAM_ID_DEV:PROGRAM_ID);
    const program = new Program<ChicksStakingLocked>(
      IDL,
      programId,
      provider,
    );
    const pool_handle = (handle as string).trim();
    const mintPubkey = toPublicKey(token);
    const reward_rate = Number(apr) * 100;
    const vesting_interval = interval;
    const lock_time = lock < 10000? lock * 86400:lock;

    [stakingV3Pubkey, stakingV3Bump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          mintPubkey.toBuffer(),
          Buffer.from(STAKING_PDA_SEED_V3),
          Buffer.from(pool_handle)
        ],
        program.programId
      );

    const txId = await program.methods
      .updateConfig(
        stakingV3Bump,
        pool_handle,
        new anchor.BN(lock_time),
        new anchor.BN(vesting_interval),
        new anchor.BN(reward_rate),
      )
      .accounts({
        initializer: provider.wallet.publicKey,
        tokenMint: mintPubkey,
        stakingAccountV3: stakingV3Pubkey,
      })
      .rpc();
    console.log(`txId: ${txId}`);
  });

program
  .command('deposit-reward')
  .requiredOption('-k, --keypair <path>', `Solana wallet location`)
  .option(
    '-e, --env <string>',
    'Solana cluster env name. One of: mainnet-beta, testnet, devnet',
    'mainnet-beta',
  )
  .requiredOption('-h --handle <string>', 'Staking handle')
  .requiredOption('-t --token <string>', 'Token address', CHICKS_TOKEN_ADDRESS)
  .requiredOption('--amount <number>', 'Amount, e.g.) 10000')
  .requiredOption('--decimals <number>', 'Decimals', '9')
  .action(async (_directory: any, cmd: any) => {
    const {
      keypair,
      env,
      handle,
      token,
      amount,
      decimals,
    } = cmd.opts();

    const serviceKeypair = loadWalletKey(keypair);
    const provideOptions = AnchorProvider.defaultOptions();
    const connection = new Connection(
      clusterApiUrl(env),
      provideOptions.commitment,
    );

    const walletWrapper = new anchor.Wallet(serviceKeypair);
    const provider = new AnchorProvider(connection, walletWrapper, {
      preflightCommitment: 'recent',
    });
    const isDev = env != 'mainnet-beta';
    const programId = new PublicKey(isDev? PROGRAM_ID_DEV:PROGRAM_ID);
    const program = new Program<ChicksStakingLocked>(
      IDL,
      programId,
      provider,
    );
    const pool_handle = (handle as string).trim();
    const mintPubkey = toPublicKey(token);

    [vaultPubKey, vaultBump] = await anchor.web3.PublicKey.findProgramAddress(
      [mintPubkey.toBuffer(), Buffer.from(pool_handle)],
      program.programId
    );

    [stakingV3Pubkey, stakingV3Bump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          mintPubkey.toBuffer(),
          Buffer.from(STAKING_PDA_SEED_V3),
          Buffer.from(pool_handle)
        ],
        program.programId
      );

    const walletTokenAccount = Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mintPubkey,
      provider.wallet.publicKey,
    );

    let deposit_amount = new anchor.BN(amount).mul(new anchor.BN(10 ** decimals));
    await program.methods
      .depositReward(vaultBump, stakingV3Bump, pool_handle, deposit_amount)
      .accounts({
        tokenMint: mintPubkey,
        tokenFrom: walletTokenAccount,
        tokenFromAuthority: provider.wallet.publicKey,
        tokenVault: vaultPubKey,
        stakingAccountV3: stakingV3Pubkey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  });

program
  .command('check-reward')
  .option(
    '-e, --env <string>',
    'Solana cluster env name. One of: mainnet-beta, testnet, devnet',
    'mainnet-beta',
  )
  .requiredOption('-h --handle <string>', 'Staking handle')
  .requiredOption('-t --token <string>', 'Token address', CHICKS_TOKEN_ADDRESS)
  .action(async (_directory: any, cmd: any) => {
    const {
      env,
      handle,
      token,
    } = cmd.opts();

    const serviceKeypair = Keypair.generate();
    const provideOptions = AnchorProvider.defaultOptions();
    const connection = new Connection(
      clusterApiUrl(env),
      provideOptions.commitment,
    );

    const walletWrapper = new anchor.Wallet(serviceKeypair);
    const provider = new AnchorProvider(connection, walletWrapper, {
      preflightCommitment: 'recent',
    });
    const isDev = env != 'mainnet-beta';
    const programId = new PublicKey(isDev? PROGRAM_ID_DEV:PROGRAM_ID);
    const program = new Program<ChicksStakingLocked>(
      IDL,
      programId,
      provider,
    );
    const pool_handle = (handle as string).trim();
    const mintPubkey = toPublicKey(token);

    [vaultPubKey, vaultBump] = await anchor.web3.PublicKey.findProgramAddress(
      [mintPubkey.toBuffer(), Buffer.from(pool_handle)],
      program.programId
    );

    [stakingV3Pubkey, stakingV3Bump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          mintPubkey.toBuffer(),
          Buffer.from(STAKING_PDA_SEED_V3),
          Buffer.from(pool_handle)
        ],
        program.programId
      );

    const stakingV3Account = await program.account.stakingAccountV3.fetch(stakingV3Pubkey);
    console.log('Remaining Amount', stakingV3Account.remainRewardAmount.toNumber().toLocaleString());
  });

program
  .command('update-user')
  .requiredOption('-k, --keypair <path>', `Solana wallet location`)
  .option(
    '-e, --env <string>',
    'Solana cluster env name. One of: mainnet-beta, testnet, devnet',
    'mainnet-beta',
  )
  .requiredOption('-t --token <string>', 'Token address', CHICKS_TOKEN_ADDRESS)
  .action(async (_directory: any, cmd: any) => {
    const {
      keypair,
      env,
      token,
    } = cmd.opts();

    const serviceKeypair = loadWalletKey(keypair);
    const provideOptions = AnchorProvider.defaultOptions();
    const connection = new Connection(
      clusterApiUrl(env),
      provideOptions.commitment,
    );

    const walletWrapper = new anchor.Wallet(serviceKeypair);
    const provider = new AnchorProvider(connection, walletWrapper, {
      preflightCommitment: 'recent',
    });
    const isDev = env != 'mainnet-beta';
    const programId = new PublicKey(isDev? PROGRAM_ID_DEV:PROGRAM_ID);
    const program = new Program<ChicksStakingLocked>(
      IDL,
      programId,
      provider,
    );
    const pool_handle = 'pool1';
    const mintPubkey = toPublicKey(token);
    const handle = '89d879cfa54e35967879c070a00bbd2f';
    const userWallet = 'FYFmPpquZRxLSiaYK6FDpFZseYxt7FmxqhfNPjjmHdiR';
    const startTime = new Date('2022-02-05').getTime() / 1000;

    const USER_STAKING_PDA_SEED_V3 = "user_staking_v3";
    [stakingV3Pubkey, stakingV3Bump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          mintPubkey.toBuffer(),
          Buffer.from(STAKING_PDA_SEED_V3),
          Buffer.from(pool_handle)
        ],
        program.programId
      );

    const [userStakingV3Pubkey] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          mintPubkey.toBuffer(),
          toPublicKey(userWallet).toBuffer(),
          Buffer.from(handle),
          Buffer.from(USER_STAKING_PDA_SEED_V3),
        ],
        program.programId
      );

    const txId = await program.methods
      .updateUserStakeAccount(
        pool_handle,
        handle,
        new anchor.BN(startTime),
      )
      .accounts({
        initializer: provider.wallet.publicKey,
        tokenMint: mintPubkey,
        stakingAccountV3: stakingV3Pubkey,
        userAuthority: toPublicKey(userWallet),
        userStakingAccountV3: userStakingV3Pubkey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    console.log(`txId: ${txId}`);
  });

program
  .command('update-user-v2')
  .requiredOption('-k, --keypair <path>', `Solana wallet location`)
  .option(
    '-e, --env <string>',
    'Solana cluster env name. One of: mainnet-beta, testnet, devnet',
    'mainnet-beta',
  )
  .requiredOption('-t --token <string>', 'Token address', CHICKS_TOKEN_ADDRESS)
  .action(async (_directory: any, cmd: any) => {
    const {
      keypair,
      env,
      token,
    } = cmd.opts();

    const serviceKeypair = loadWalletKey(keypair);
    const provideOptions = AnchorProvider.defaultOptions();
    const connection = new Connection(
      clusterApiUrl(env),
      provideOptions.commitment,
    );

    const walletWrapper = new anchor.Wallet(serviceKeypair);
    const provider = new AnchorProvider(connection, walletWrapper, {
      preflightCommitment: 'recent',
    });
    const isDev = env != 'mainnet-beta';
    const programId = new PublicKey(isDev? PROGRAM_ID_DEV:PROGRAM_ID);
    const program = new Program<ChicksStakingLocked>(
      IDL,
      programId,
      provider,
    );
    const pool_handle = 'pool1';
    const mintPubkey = toPublicKey(token);
    const handle = '89d879cfa54e35967879c070a00bbd2f';
    const userWallet = 'FYFmPpquZRxLSiaYK6FDpFZseYxt7FmxqhfNPjjmHdiR';
    const startTime = new Date('2022-02-05').getTime() / 1000;

    [stakingV3Pubkey, stakingV3Bump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          mintPubkey.toBuffer(),
          Buffer.from(STAKING_PDA_SEED_V3),
          Buffer.from(pool_handle)
        ],
        program.programId
      );

    const [userStakingV2Pubkey] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          toPublicKey(userWallet).toBuffer(),
          Buffer.from(handle),
        ],
        program.programId
      );

    const txId = await program.methods
      .updateUserStakeAccountV2(
        pool_handle,
        handle,
        new anchor.BN(startTime),
      )
      .accounts({
        initializer: provider.wallet.publicKey,
        tokenMint: mintPubkey,
        stakingAccountV3: stakingV3Pubkey,
        userAuthority: toPublicKey(userWallet),
        userStakingAccountV2: userStakingV2Pubkey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    console.log(`txId: ${txId}`);
  });


program.parse(process.argv);