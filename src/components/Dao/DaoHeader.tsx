import * as React from "react";
import { IDAOState, Scheme, Token } from "@daostack/client";
import { formatTokens, supportedTokens, fromWei, baseTokenName, ethErrorHandler, genName,  } from "lib/util";
import withSubscription, { ISubscriptionProps } from "components/Shared/withSubscription";
import AccountImage from "components/Account/AccountImage";
import * as css from "./DaoHeader.scss";
import BN = require("bn.js");
import { getArc } from "arc";
import { first } from "rxjs/operators";

const styles = { 
  circularSquare: {
    borderRadius: "50%",
    borderColor: "white",
    borderStyle: "solid",  
  },
};

interface ISignal {
  id: string;
  data: any | string;
}

interface IExternalProps {
  daoState: IDAOState | any;
  signal?: ISignal | any;
}

type IProps = IExternalProps & ISubscriptionProps<[Scheme[], ISignal, IDAOState | any]>;

class DaoHeaderComponent extends React.Component<IProps, any> {
  render() {
    const { daoState, signal } = this.props;
    const { name, memberCount, address, reputationTotalSupply } = daoState;
    const data = {
      daoImg: "/assets/images/generic-user-avatar.png",
      reputationHolders: memberCount,
      description: `
      ${name} is an independent, global community of people working together to build and promote Decentralized Autonomous Organizations (DAOs). 
      It’s the perfect place to get involved with DAOstack.
      `,
    };
    /***** DAO ETH Balance *****/
  interface IEthProps extends ISubscriptionProps<BN|null> {
    dao: IDAOState;
  }

  const ETHBalance = (props: IEthProps) => {
      const { data } = props;
      return <li key="ETH" className={css.holdingsAmount}><span>{formatTokens(data)} {baseTokenName()}</span></li>;
    };

const SubscribedEthBalance = withSubscription({
  wrappedComponent: ETHBalance,
  loadingComponent: <li key="ETH">... {baseTokenName()}</li>,
  errorComponent: null,
  checkForUpdate: (oldProps: IEthProps, newProps: IEthProps) => {
    return oldProps.dao.address !== newProps.dao.address;
  },
  createObservable: (props: IEthProps) => {
    const arc = getArc();
    return arc.dao(props.dao.address).ethBalance().pipe(ethErrorHandler());
  },
});

/***** Token Balance *****/
interface ITokenProps extends ISubscriptionProps<any> {
  dao: IDAOState;
  tokenAddress: string;
}

const TokenBalance = (props: ITokenProps) => {
  const { data, error, isLoading, tokenAddress } = props;

  const tokenData = supportedTokens()[tokenAddress];
  if (isLoading || error || ((data === null || isNaN(data) || data.isZero()) && tokenData.symbol !== genName())) {
    return null;
  }

  return (
    <li key={tokenAddress} className={css.holdingsAmount}>
      <span>{formatTokens(data, tokenData["symbol"], tokenData["decimals"])}</span>
    </li>
  );
};

const SubscribedTokenBalance = withSubscription({
  wrappedComponent: TokenBalance,
  checkForUpdate: (oldProps: ITokenProps, newProps: ITokenProps) => {
    return oldProps.dao.address !== newProps.dao.address || oldProps.tokenAddress !== newProps.tokenAddress;
  },
  createObservable: async (props: ITokenProps) => {
    // General cache priming for the DAO we do here
    // prime the cache: get all members fo this DAO -
    const daoState = props.dao;

    await daoState.dao.members({ first: 1000, skip: 0 }).pipe(first()).toPromise();

    const arc = getArc();
    const token = new Token(props.tokenAddress, arc);
    return token.balanceOf(daoState.address).pipe(ethErrorHandler());
  },
});

    return (
      <div className={css.headerWrap}>
        <div className={css.daoImg}>
          {/* Logo will go here instead of AccountImage this is just a placeholder */}
          <AccountImage
            accountAddress={address}
            width={106}
            style={styles.circularSquare}
          />
        </div>
        <div className={css.daoInfo}>
          <b className={css.daoName}>
            { signal.name ? signal.name : name }
          </b>
          <b className={css.reputationHolders}>
            { data.reputationHolders } Reputation Holders
          </b>
        </div>

        <div className={css.holdings}>
          <span>Holdings</span>
          <ul className={css.holdingsList}>
           <li key={"0x0"} className={css.holdingsAmount}>
             <span>{fromWei(reputationTotalSupply).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})} REP</span>
            </li>    
            <SubscribedEthBalance dao={daoState} />
            {Object.keys(supportedTokens()).map((tokenAddress) => {
              return <SubscribedTokenBalance tokenAddress={tokenAddress} dao={daoState} key={"token_" + tokenAddress} />;
            })}
          </ul>
        </div>
        
        <div className={css.daoHeadingGroup}>
          <div className="header">
            This is the { name } Header
          </div>
          <p className={css.daoDescription}>
            { data.description }
          </p>
        </div>
      </div>
    );
  }
}

const DaoHeader = withSubscription({
  wrappedComponent: DaoHeaderComponent,
  checkForUpdate: [],
  createObservable: (props: IExternalProps) => {
    const dao = props.daoState.dao;
    return dao.schemes({}, { fetchAllData: true, subscribe: true });
  },
});

export default DaoHeader;
