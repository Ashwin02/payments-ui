import * as actionTypes from 'constants/action-types';
import { default as management, initialMgmtState } from 'reducers/management';


describe('management reducer', () => {

  it('sets a default view on sign-in', () => {
    assert.deepEqual(
      management(null, {type: actionTypes.USER_SIGNED_IN}),
      Object.assign({}, initialMgmtState, {
        tab: 'profile',
        view: actionTypes.SHOW_MY_ACCOUNT,
      })
    );
  });

  it('preserves view state on sign-in', () => {
    var existingState = Object.assign({}, initialMgmtState, {
      tab: 'pay-methods',
      view: actionTypes.SHOW_PAY_METHODS,
    });
    assert.deepEqual(
      management(existingState, {type: actionTypes.USER_SIGNED_IN}),
      existingState
    );
  });

});
