require('dotenv').config();
const Web3 = require('web3');
const { ChainId, Token, TokenAmount, Pair, Fetcher } = require('@uniswap/sdk')
const abis = require('./abis');
const {mainnet: addresses } = require('./addresses');

const web3 = new Web3(process.env.INFURA_URL);

const kyber = new web3.eth.Contract(
    abis.kyber.kyberNetworkProxy,
    addresses.kyber.kyberNetworkProxy
);

const AMOUNT_ETH = 25;
const RECENT_ETH_PRICE = 1900;
const AMOUNT_ETH_WEI = web3.utils.toWei(AMOUNT_ETH.toString());
const AMOUNT_DAI_WEI = web3.utils.toWei((AMOUNT_ETH * RECENT_ETH_PRICE).toString());

const init = async() => {
    const [dai, weth] = await Promise.all(
        [addresses.tokens.dai, addresses.tokens.weth].map(tokenAddress => (
            Fetcher.fetchTokenData(
                ChainId.MAINNET,
                tokenAddress
            )
    )));
    const daiWeth = await Fetcher.fetchPairData(
        dai,
        weth
    );

    web3.eth.subscribe('newBlockHeaders')
    .on('data', async block => {
        console.log(`New block received. Block # ${block.number}`);

        const kyberResult = await Promise.all([
            kyber.methods.getExpectedRate(
                addresses.tokens.dai,
                '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                AMOUNT_DAI_WEI
            ).call(),

            kyber.methods.getExpectedRate(
                '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                addresses.tokens.dai,
                AMOUNT_DAI_WEI
            ).call()
        ]);

        const kyberRates = {
            buy: parseFloat(1 / (kyberResult[0].expectedRate / (10 ** 18))),
            sell: parseFloat(kyberResult[1].expectedRate / (10 ** 18))
        }
        console.log(kyberResult);
        console.log('KYBER ETH/DAI');
        console.log(kyberRates);

        const uniswapResult = await Promise.all([
            daiWeth.getOutputAmount(new TokenAmount(dai, AMOUNT_DAI_WEI)),
            daiWeth.getOutputAmount(new TokenAmount(weth, AMOUNT_ETH_WEI))
        ])
        console.log(uniswapResult);
    })
    .on('error', error => {
        console.log(error);
    })
};
init();