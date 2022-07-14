
## Command

### Update config
- devnet
ts-node .\scripts\tool.ts update-config -h pool1 --lock 120 --apr 30 -t FUnRfJAJiTtpSGP9uP5RtFm4QPsYUPTVgSMoYrgVyNzQ -e devnet --keypair D:\BlockChain\Solana\projects\keys\alice.json

ts-node .\scripts\tool.ts update-config -h pool2 --lock 240 --apr 45 -t FUnRfJAJiTtpSGP9uP5RtFm4QPsYUPTVgSMoYrgVyNzQ -e devnet --keypair D:\BlockChain\Solana\projects\keys\alice.json

ts-node .\scripts\tool.ts update-config -h pool3 --lock 360 --apr 60 -t FUnRfJAJiTtpSGP9uP5RtFm4QPsYUPTVgSMoYrgVyNzQ -e devnet --keypair D:\BlockChain\Solana\projects\keys\alice.json

### Update user
- v3
ts-node .\scripts\tool.ts update-user -t FUnRfJAJiTtpSGP9uP5RtFm4QPsYUPTVgSMoYrgVyNzQ -e devnet --keypair D:\BlockChain\Solana\projects\keys\alice.json
- v2
  ts-node .\scripts\tool.ts update-user-v2 -t FUnRfJAJiTtpSGP9uP5RtFm4QPsYUPTVgSMoYrgVyNzQ -e devnet --keypair D:\BlockChain\Solana\projects\keys\alice.json
### Migrate all
ts-node .\scripts\tool.ts migrate-all -e devnet --keypair D:\BlockChain\Solana\projects\keys\alice.json