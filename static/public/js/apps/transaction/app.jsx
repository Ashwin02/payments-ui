import 'shims';

import React, { Component, PropTypes } from 'react';

import { Connector, Provider } from 'react-redux';
import { bindActionCreators } from 'redux';

import dataStore from 'data-store';
import ErrorMessage from 'components/error';
import DefaultLogin from 'views/shared/login';
import DefaultTransaction from 'views/transaction';

import * as userActions from 'actions/user';
import { parseQuery } from 'utils';


export default class TransactionApp extends Component {

  static propTypes = {
    Login: PropTypes.func.isRequired,
    Transaction: PropTypes.func.isRequired,
    win: PropTypes.object,
  }

  static defaultProps = {
    Login: DefaultLogin,
    Transaction: DefaultTransaction,
    win: window,
  }

  constructor(props) {
    super(props);
    var qs = parseQuery(props.win.location.href);
    // TODO: we should validate/clean this input to raise early errors.
    this.state = {
      accessToken: qs.access_token,
      productId: qs.product,
    };
  }

  selectData(state) {
    return {
      app: state.app,
      user: state.user,
    };
  }

  render() {
    var state = this.state;
    var Login = this.props.Login;
    var Transaction = this.props.Transaction;

    return (
      <main>
        <Connector select={this.selectData}>
          {connector => {
            if (connector.app.error) {
              console.log('rendering app error');
              return <ErrorMessage error={connector.app.error} />;
            } else if (!connector.user.signedIn) {
              console.log('rendering login');
              return (
                <Login
                  accessToken={state.accessToken}
                  {...bindActionCreators(userActions, connector.dispatch) }
                />
              );
            } else {
              console.log('rendering purchase flow');
              return (
                <Transaction
                  productId={state.productId}
                  user={connector.user}
                />
              );
            }
          }}
        </Connector>
      </main>
    );
  }
}


export function init() {
  React.render((
    <Provider store={dataStore}>
      {function() {
        return <TransactionApp/>;
      }}
    </Provider>
  ), document.body);
}
