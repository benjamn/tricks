var op = Object.prototype,
    hasOwnProperty = (op.hasOwnProperty ||
                      function(name) {
                          var hasOwn, proto = this.__proto__;
                          if (proto) {
                              this.__proto__ = null;
                              hasOwn = name in this;
                              this.__proto__ = proto;
                          } else hasOwn = name in this;
                          return hasOwn;
                      });

if (!op.hasOwnProperty)
    // No pollution because browsers requiring this fix ignore
    // user-defined Object.prototype.hasOwnProperty values.
    op.hasOwnProperty = hasOwnProperty;
