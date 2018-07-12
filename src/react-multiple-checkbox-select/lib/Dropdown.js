
// MODIFIED by Dave White to match needs of Musical Playground

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DropDown = function (_Component) {
  _inherits(DropDown, _Component);

  function DropDown(props) {
    _classCallCheck(this, DropDown);

    var _this = _possibleConstructorReturn(this, (DropDown.__proto__ || Object.getPrototypeOf(DropDown)).call(this, props));

    _initialiseProps.call(_this);

    var treeData = props.treeData.length ? props.treeData : [];
    _this.state = {
      defaultList: _lodash2.default.cloneDeep(treeData),
      treeData: _lodash2.default.cloneDeep(treeData),
      isCheckedAll: false,
      isSeacrh: false
    };
    return _this;
  }

  _createClass(DropDown, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      var _state = this.state,
          treeData = _state.treeData,
          defaultList = _state.defaultList;
      var _props$value = this.props.value,
          value = _props$value === undefined ? [] : _props$value;

      treeData.map(function (item, index) {
        if (value.length) value.map(function (v) {
          if (item.value === v.value) {
            treeData[index].checked = true;
            defaultList[index].checked = true;
          }
        });
        return item;
      });
      this.setState({
        treeData: treeData,
        defaultList: defaultList,
        isCheckedAll: treeData.length === treeData.filter(function (item) {
          return item.checked === true;
        }).length
      });
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _state2 = this.state,
          isSeacrh = _state2.isSeacrh,
          isCheckedAll = _state2.isCheckedAll,
          treeData = _state2.treeData;
      var _props = this.props,
          inputPlaceholder = _props.inputPlaceholder,
          noContentText = _props.noContentText,
          dropdownClassName = _props.dropdownClassName,
          showFilterAll = _props.showFilterAll,
          allText = _props.allText;

      return _react2.default.createElement(
        'div',
        null,
        !isSeacrh && !treeData.length ? _react2.default.createElement(
          'div',
          { className: 'r-dorpdown-list r-select-not-found' },
          noContentText
        ) : _react2.default.createElement(
          'div',
          { className: 'r-dorpdown-list ' + dropdownClassName },
          _react2.default.createElement(
            'div',
            { className: 'r-search-input-div' },
            _react2.default.createElement('input', { placeholder: inputPlaceholder, onChange: this.onSearch, className: 'r-search-input' })
          ),
          _react2.default.createElement(
            'div',
            { className: 'r-checkbox-list-div' },
            !isSeacrh || (isSeacrh && showFilterAll && treeData.length) ? _react2.default.createElement(
              'div',
              { className: 'r-checkbox-item', onClick: this.onCheckedAll },
              _react2.default.createElement('span', { className: 'r-checkbox-inner ' + (isCheckedAll ? 'r-checkbox-checked' : '') }),
              _react2.default.createElement(
                'span',
                null,
                allText
              )
            ) : null,
            isSeacrh && treeData.length === 0 ? _react2.default.createElement(
              'div',
              { className: 'r-no-data-tips' },
              noContentText
            ) : treeData.map(function (item, itemIndex) {
              return _react2.default.createElement(
                'div',
                { key: item.value, className: 'r-checkbox-item', onClick: function onClick() {
                    return _this2.onCheckboxChange(itemIndex);
                  } },
                _react2.default.createElement('span', { className: 'r-checkbox-inner ' + (item.checked ? "r-checkbox-checked" : "") }),
                _react2.default.createElement(
                  'span',
                  null,
                  item.label
                )
              );
            })
          ),
          _react2.default.createElement(
            'div',
            { className: 'r-footer' },
            _react2.default.createElement(
              'span',
              null,
              '\u5DF2\u9009\u62E9\uFF1A'
            ),
            _react2.default.createElement(
              'span',
              { className: 'r-selected-num' },
              this.getSelectedLength()
            ),
            _react2.default.createElement(
              'button',
              { type: 'button', className: 'r-sure-button', onClick: this.save },
              '\u786E\u5B9A'
            )
          )
        )
      );
    }
  }]);

  return DropDown;
}(_react.Component);

var _initialiseProps = function _initialiseProps() {
  var _this3 = this;

  this.onSearch = function (e) {
    var defaultList = _this3.state.defaultList;

    var value = e.target.value;
    var treeData = defaultList.filter(function (item) {
      return item.label.toLowerCase().indexOf(value.toLowerCase()) >= 0;
    });
    _this3.setState({
      treeData: treeData,
      isSeacrh: !!value,
      isCheckedAll: treeData.length === treeData.filter(function (item) {
        return item.checked === true;
      }).length
    });
  };

  this.onCheckedAll = function () {
    var _state3 = _this3.state,
        isCheckedAll = _state3.isCheckedAll,
        treeData = _state3.treeData,
        defaultList = _state3.defaultList;


    treeData = treeData.map(function (item) {
      item.checked = !isCheckedAll;
      return item;
    });
    for (var i = 0; i < treeData.length; i++) {
      for (var j = 0; j < defaultList.length; j++) {
        if (treeData[i].value === defaultList[j].value) {
          defaultList[j].checked = treeData[i].checked;
        }
      }
    }
    _this3.setState({
      isCheckedAll: !isCheckedAll,
      treeData: treeData,
      defaultList: defaultList
    });
    _this3.save();
  };

  this.save = function () {
    var defaultList = _this3.state.defaultList;

    var values = [];
    defaultList.map(function (item) {
      if (item.checked === true) {
        values.push({ value: item.value, label: item.label });
      }
      return 0;
    });
    _this3.props.onOk(values);
  };

  this.onCheckboxChange = function (itemIndex) {
    var _state4 = _this3.state,
        treeData = _state4.treeData,
        defaultList = _state4.defaultList;

    treeData[itemIndex].checked = !treeData[itemIndex].checked;
    var newDefaultList = defaultList.map(function (item) {
      if (item.value === treeData[itemIndex].value) {
        item.checked = treeData[itemIndex].checked;
      }
      return item;
    });
    _this3.setState({
      treeData: treeData,
      defaultList: newDefaultList,
      isCheckedAll: treeData.every(function (item) {
        return item.checked === true;
      })
    });
    _this3.save();
  };

  this.getSelectedLength = function () {
    var defaultList = _this3.state.defaultList;

    var len = defaultList.filter(function (item) {
      return item.checked === true;
    }).length;
    return len;
  };
};

exports.default = DropDown;