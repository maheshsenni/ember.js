import {
  _instrumentStart,
  subscribers
} from 'ember-metal/instrumentation';

/**
  Provides instrumentation for actions. Actions can now be instrumented by subscribing to the `action` event.

  ```javascript
  Ember.subscribe("action", {
    before: function(name, timestamp, payload) {

    },

    after: function(name, timestamp, payload) {

    }
  });
  ```

  The `before` and `after` callbacks get the action path name as the first argument. They also
  get the action name, arguments passed to the actions and the target context in the payload.

  For example, subscription for an action named `submit` in `IndexController` would be as follows,

  ```javascript
  Ember.subscribe("action.controller.index.submit", {
    before: function(name, timestamp, payload) {
      // name is "action.controller.index.submit"
    },

    after: function(name, timestamp, payload) {

    }
  });
  ```

  Subscriptions for actions on other targets would follow a similar pattern:

  * `action.route.index.submit` listens for `submit` action on `IndexRoute`
  * `action.component.appUser.submit` listens for `submit` action on `appUser`

  Closure actions can also be instrumented with a minor difference to the action path name. Instead
  of an action name, closure action path names will end with `closure`.

  For example, `action.controller.index.closure` will subscribe to all closure actions created out of actions
  in the `IndexController`.

  @param {String} action Name of the action triggered
  @param {Function} callback The function to instrument
  @param {Object} context The context to call the function with
  @param {Array} an array of arguments passed to the action
  @return {Object} Return value from the invoked callback
  @private
*/
export function instrument(actionName, callback, context, actionArguments) {
  var instrumentName, val, details, end;
  // Only instrument if there's at least one subscriber.
  if (subscribers.length) {
    if (context && context._debugContainerKey) {
      instrumentName = '.' + context._debugContainerKey.split(':').join('.');
      if (typeof actionName === 'string') {
        instrumentName += '.' + actionName;
      } else if (typeof actionName === 'function') {
        instrumentName += '.closure';
      }
    } else {
      instrumentName = '';
    }
    details = {
      action: actionName,
      target: context,
      args: actionArguments
    };
    end = _instrumentStart('action' + instrumentName, function actionInstrumentDetails() {
      return details;
    });
    val = callback.call(context);
    if (end) {
      end();
    }
    return val;
  } else {
    return callback.call(context);
  }
}
