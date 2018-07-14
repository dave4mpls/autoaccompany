
// MODIFIED by Dave White to match needs of Musical Playground


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactDom = require('react-dom');

var _Dropdown = require('./Dropdown');

var _Dropdown2 = _interopRequireDefault(_Dropdown);

require('./assets/style.css');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Select = function (_Component) {
  _inherits(Select, _Component);

  function Select(props) {
    _classCallCheck(this, Select);

    var _this = _possibleConstructorReturn(this, (Select.__proto__ || Object.getPrototypeOf(Select)).call(this, props));

    _initialiseProps.call(_this);

    var _props$disabled = props.disabled,
        disabled = _props$disabled === undefined ? false : _props$disabled,
        _props$labelPlacehold = props.labelPlaceholder,
        labelPlaceholder = _props$labelPlacehold === undefined ? 'Select an option' : _props$labelPlacehold,
        _props$inputPlacehold = props.inputPlaceholder,
        inputPlaceholder = _props$inputPlacehold === undefined ? 'Please enter key words' : _props$inputPlacehold,
        _props$noContentText = props.noContentText,
        noContentText = _props$noContentText === undefined ? 'No match yet' : _props$noContentText,
        _props$allText = props.allText,
        allText = _props$allText === undefined ? 'All' : _props$allText;


    _this.state = {
      disabled: disabled,
      labelPlaceholder: labelPlaceholder,
      inputPlaceholder: inputPlaceholder,
      noContentText: noContentText,
      allText: allText,
      treeData: props.data || [],
      value: _this.getPropsValues(props),
      isOpen: false
    };
    _this.rootRef = _this;
    document.addEventListener('mousedown', _this.onDocumentClick);
    return _this;
  }

  _createClass(Select, [{
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(nextProps) {
      if ('data' in nextProps) {
        this.setState({
          value: this.getPropsValues(nextProps),
          treeData: nextProps.data || []
        });
      }
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      document.removeEventListener('mousedown', this.onDocumentClick);
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _state = this.state,
          value = _state.value,
          treeData = _state.treeData,
          isOpen = _state.isOpen,
          inputPlaceholder = _state.inputPlaceholder,
          noContentText = _state.noContentText,
          disabled = _state.disabled,
          allText = _state.allText;
      var _props = this.props,
          _props$className = _props.className,
          className = _props$className === undefined ? '' : _props$className,
          _props$dropdownClassN = _props.dropdownClassName,
          dropdownClassName = _props$dropdownClassN === undefined ? '' : _props$dropdownClassN,
          _props$showFilterAll = _props.showFilterAll,
          showFilterAll = _props$showFilterAll === undefined ? false : _props$showFilterAll;

      return _react2.default.createElement(
        'div',
        { className: 'r-multiple-select-list ' + className, ref: function ref(r) {
            return _this2.rootRef = r;
          } },
        _react2.default.createElement(
          'div',
          { className: 'r-label-list ' + (disabled ? 'r-label-list-disabled' : ''), onClick: disabled ? null : this.onInputClick },
          value.length ? value.map(function (item) {
            return item.label;
          }).join(', ') : "None",
          _react2.default.createElement('span', { className: 'r-arrow-span ' + (isOpen ? "r-arrow-open" : "r-arrow-close") })
        ),
        isOpen ? _react2.default.createElement(_Dropdown2.default, {
          treeData: treeData,
          onOk: this.submit,
          value: value,
          inputPlaceholder: inputPlaceholder,
          noContentText: noContentText,
          allText: allText,
          dropdownClassName: dropdownClassName,
          showFilterAll: showFilterAll
        }) : null
      );
    }
  }]);

  return Select;
}(_react.Component);

var _initialiseProps = function _initialiseProps() {
  var _this3 = this;

  this.getPropsValues = function (props) {
    if (props.data) {
      var value = [];
      props.data.map(function (item, index) {
        props.value && props.value.map(function (v) {
          if (item.value === v) {
            value.push({ value: item.value, label: item.label, checked: true });
          }
          return 0;
        });
        return 0;
      });
      return value;
    }
    return [];
  };

  this.onDocumentClick = function (e) {
    if (_this3.state.isOpen === false) return;
    var target = e.target;
    var root = (0, _reactDom.findDOMNode)(_this3.rootRef);
    if (!_this3.contains(root, target)) {
      _this3.setState({
        isOpen: false
      });
    }
  };

  this.contains = function (root, n) {
    var node = n;
    while (node) {
      if (node === root) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  };

  this.onInputClick = function () {
    var isOpen = _this3.state.isOpen;

    _this3.setState({
      isOpen: !isOpen
    });
  };

  this.submit = function (values) {
    var onSubmit = _this3.props.onSubmit;

    onSubmit && onSubmit(values);
    _this3.setState({
      value: values
    });
  };
};

exports.default = Select;