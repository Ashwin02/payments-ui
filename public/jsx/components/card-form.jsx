'use strict';

var $ = require('jquery');
var CardValidator = require('card-validator');
var MaskedInput = require('react-maskedinput');
var Navigation = require('react-router').Navigation;
var React = require('react');
var braintree = require('braintree-web');

var utils = require('utils');
var gettext = utils.gettext;
var InputError = require('components/input-error');

module.exports = React.createClass({

  displayName: 'CardForm',

  propTypes: {
    'data-token': React.PropTypes.string.isRequired,
    'id': React.PropTypes.string.isRequired,
    fields: React.PropTypes.array.isRequired,
  },

  mixins: [Navigation],

  getDefaultProps: function() {
    return {
      fields: [
        {
          'data-braintree-name': 'number',
          'id': 'card',
          'ref': 'card',
          'type': 'tel',
          'validator': 'number',
          'error': {
            'message': utils.gettext('Incorrect card number'),
          },
        }, {
          'classNames': ['expiration'],
          'data-braintree-name': 'expiration_date',
          'id': 'expiration',
          'type': 'tel',
          'validator': 'expirationDate',
          'error': {
            'message': utils.gettext('Invalid expiry date'),
          },
        }, {
          'classNames': ['cvv'],
          'data-braintree-name': 'cvv',
          'id': 'cvv',
          'type': 'tel',
          'validator': 'cvv',
        },
      ],
    };
  },

  getInitialState: function() {
    return {
      isSubmitting: false,
      cardholder: '',
      card: '',
      expiration: '',
      cvv: '',
    };
  },

  contextTypes: {
    router: React.PropTypes.func,
  },

  cardPatterns: {
    'default': {
      number: {
        pattern: '1111 1111 1111 1111',
        placeholder: gettext('Card number'),
      },
      cvv: {
        pattern: '111',
        placeholder: gettext('CVV'),
      },
      expirationDate: {
        label: gettext('Expiry Date'),
        pattern: '11/11',
        placeholder: 'MM/YY',
      },
    },
    'american-express': {
      number: {
        pattern: '1111 111111 11111',
      },
      cvv: {
        pattern: '1111',
        placeholder: gettext('CID'),
      },
    },
    'diners-club': {
      number: {
        pattern: '1111 111111 1111',
      },
      cvv: {
        pattern: '111',
        placeholder: gettext('CVV'),
      },
    },
  },


  handleChange: function(index, e) {
    var stateChange = {};
    var val = e.target.value;
    stateChange[e.target.id] = val;
    this.setState(stateChange);
  },

  handleSubmit: function(e) {
    var { router } = this.context;
    e.preventDefault();
    this.setState({isSubmitting: true});
    var client = new braintree.api.Client({
      clientToken: this.props['data-token'],
    });
    client.tokenizeCard({
      number: this.state.card,
      expirationDate: this.state.expiration,
      cvv: this.state.cvv,
      cardholderName: this.state.cardholder,
    }, function(err, nonce) {
      if (err) {
        // TODO: error handling
        console.log(err);
      } else {
        $.ajax({
          data: {
            pay_method_nonce: nonce,
            plan_id: 'mozilla-concrete-brick',
          },
          url: '/api/braintree/subscriptions/',
          method: 'post',
          dataType: 'json',
        }).then(function() {
          console.log('Successfully subscribed + completed payment');
          router.transitionTo('complete');
        });
      }
    });
  },

  // Just a convenience mapping for cards from card-validator
  // to shorted classes used in CSS.
  cardTypeMap: {
    'american-express': 'amex',
    'diners-club': 'diners',
    'master-card': 'mastercard',
  },

  render: function() {
    var fieldList = [];
    var that = this;
    var allValid = true;
    var isButtonDisabled;
    var detectedCard = null;

    var { fields, ...formAttrs } = this.props;

    fields.map(function(field, index) {
      var showFieldError = false;

      // This uses ES7 'destructuring assignments' to
      // pass every key *not* starting with '...' to
      // vars and the remaining key value pairs are left
      // to be passed into the element with {...attrs}
      // helps a lot to DRY things up.
      var { label, placeholder, validator,
            classNames, pattern, error, ...attrs } = field;

      var val = that.state[field.id];
      var cardClassName;
      var fieldClass;
      // Operate on a copy of the classNames list.
      var fieldClassNames = classNames &&
        classNames.slice ? classNames.slice(0) : [];

      // Validate the value
      if (val && validator) {
        // We strip out the '_' added to the value by react-masked-input.
        var valData = CardValidator[validator](val.replace(/_/g, ''));
        var isValid = valData.isValid === true;
        var isPotentiallyValid = valData.isPotentiallyValid;

        // Show an error when we know the field is truly invalid
        showFieldError = !isValid && !isPotentiallyValid;

        if (!isValid) {
          fieldClassNames.push('invalid');
          allValid = false;
        }

        // Handle a card type if detected.
        // This results in an icon to be rendered when the card is detected.
        if (valData.card) {
          var card = valData.card;
          detectedCard = card.type;
          cardClassName = card.type ? 'card-icon cctype-' +
                            (that.cardTypeMap[card.type] || card.type) : '';
        }
      }

      if (validator) {
        // Update the pattern for card + cvv field if card was detected.
        var cardData = that.cardPatterns.default[validator];
        if (detectedCard && that.cardPatterns[detectedCard]) {
           cardData = utils.defaults(
                        that.cardPatterns[detectedCard][validator], cardData);
        }
        pattern = cardData.pattern;
        placeholder = cardData.placeholder;
        label = cardData.label || cardData.placeholder;
      }

      // For non card-validator fields provide a fallback for label;
      if (!validator) {
        label = field.label || field.placeholder;
      }

      if (fieldClassNames.length) {
        fieldClass = fieldClassNames.join(' ');
      }

      // We're assuming all fields are required.
      // so we need to mark the form as invalid
      // if the value of this field is an empty string.
      // TODO: consider using the required attr.
      if (val === '') {
        allValid = false;
      }

      var type = field.type || 'text';

      isButtonDisabled = that.state.isSubmitting || allValid === false || null;

      fieldList.push(
        <label className={fieldClass} key={field.id} htmlFor={field.id} >
          <span className="vh">{label}</span>
          { cardClassName ? <span className={cardClassName}
                                  ref="card-icon" /> : null }
          { showFieldError ? <InputError text={error.message} /> : null }
          { pattern ?
            <MaskedInput {...attrs}
                         onChange={that.handleChange.bind(that, index)}
                         pattern={pattern}
                         placeholder={placeholder}
                         type={type}
            /> : <input {...attrs}
                        onChange={that.handleChange.bind(that, index)}
                        placeholder={placeholder}
                        type={type}
            />
          }
        </label>
      );
    });

    return (
      <form {...formAttrs} onSubmit={this.handleSubmit}>
        {fieldList}
        <button className={this.state.isSubmitting ? 'spinner' : null}
                disabled={isButtonDisabled}
                type="submit">Subscribe</button>
      </form>
    );
  },
});