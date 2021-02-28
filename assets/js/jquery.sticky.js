(function($, win) {
    "use strict";
    const requestFrame = (function() {
        const raf =
            win.requestAnimationFrame ||
            win.mozRequestAnimationFrame ||
            win.webkitRequestAnimationFrame ||
            function(fn) {
                return win.setTimeout(fn, 20);
            };
        return function(fn) {
            return raf(fn);
        };
    })();
    const style = (win.document.body || win.document.documentElement).style;
    const prop = "transition";
    const supportsTransition = typeof style[prop] == "string";
    const events = {
        created: "sticky-created",
        update: "sticky-update",
        top: "sticky-hit-top",
        bottom: "sticky-hit-bottom",
        frozen: "sticky-frozen",
        unfrozen: "sticky-unfrozen",
    };

    function Sticky(elm, par, options) {
        this.element = elm;
        this.parent = par;
        this._frozen = false;
        this._stopped = true;
        this.options = $.extend({ useTransition: true, animate: true, animTime: 200, animDelay: 300 },
            options
        );
        const offset = parseInt(options.offset, 10);
        this.options.offset = isNaN(offset) ? 0 : offset;
        this.init();
    }
    Sticky.prototype.init = function() {
        let transition = "";
        if (this.options.useTransition && supportsTransition) {
            transition = `top ${this.options.animTime}ms ease-in-out`;
            this.options.animate = false;
        }
        this.parent.css({ position: "relative" });
        this.element
            .addClass("sticky-scroll")
            .css({ transition: transition, position: "relative" });
        this.element.trigger(events.created);
        this.update();
    };
    Sticky.prototype.update = function() {
        this.setBoundaries(0);
        this.moveIt();
        this.element.trigger(events.update);
    };
    Sticky.prototype.moveIt = function() {
        const scrollTop =
            (win.document.documentElement.scrollTop || win.document.body.scrollTop) +
            this.options.offset;
        const height = this.element.outerHeight(true);
        const realStop = this._stop - height;
        if (this._parentHeight - this._offset > height && !this._frozen) {
            if (scrollTop >= this._start && scrollTop <= realStop) {
                this.updateOffset(scrollTop - this._start);
                this._stopped = false;
            } else {
                if (scrollTop < this._start) {
                    this.updateOffset(0);
                    if (!this._stopped) {
                        this.element.trigger(events.top);
                    }
                    this._stopped = true;
                } else if (scrollTop > realStop) {
                    this.updateOffset(this._parentHeight - height - this._offset);
                    if (!this._stopped) {
                        this.element.trigger(events.bottom);
                    }
                    this._stopped = true;
                }
            }
        }
    };
    Sticky.prototype.setBoundaries = function(offset) {
        this._offset =
            typeof offset === "undefined" ? this.element.position().top : offset;
        this._start = this.parent.offset().top + this._offset;
        this._parentHeight = this.parent[0].offsetHeight;
        this._stop = this._start + this._parentHeight - this._offset;
    };
    Sticky.prototype.setOffset = function(newOffset) {
        newOffset = parseInt(newOffset, 10);
        if (!isNaN(newOffset)) {
            this.options.offset = newOffset;
            this.moveIt();
        }
    };
    Sticky.prototype.updateOffset = function(yOffset) {
        if (this._lastPosition !== yOffset) {
            if (this.options.animate) {
                this.element
                    .stop(true, false)
                    .delay(this.options.animDelay)
                    .animate({ top: yOffset }, this.animTime);
            } else {
                this.element.css("top", yOffset);
            }
            this._lastPosition = yOffset;
        }
    };
    Sticky.prototype.toggleFreeze = function() {
        this._frozen = !this._frozen;
        this.element.stop(true, false);
        if (!this._frozen) {
            this.element.trigger(events.unfrozen);
            this.moveIt();
        } else {
            this.element.trigger(events.frozen);
        }
    };
    $.fn.sticky = function(parentName, options) {
        const method = parentName;
        let ret = false;
        this.each(function() {
            const self = $(this);
            let instance = self.data("stickyInstance");
            if (instance && (options || method)) {
                if (typeof options === "object") {
                    ret = $.extend(instance.options, options);
                } else if (options === "options") {
                    ret = instance.options;
                } else if (typeof instance[method] === "function") {
                    ret = instance[method](options);
                } else {
                    console.error(`Sticky Element has no option/method named ${method}`);
                }
            } else {
                let parent = null;
                if (parent) {
                    parent = self.parent().closest(parent);
                } else {
                    parent = self.parent();
                }
                instance = new Sticky(self, parent, options || {});
                self.data("stickyInstance", instance);
                $.fn.sticky._instances.push(instance);
            }
        });
        return ret || this;
    };

    function updateAll() {
        const len = $.fn.sticky._instances.length;
        for (let i = 0; i < len; i++) {
            $.fn.sticky._instances[i].update();
        }
    }
    $.fn.sticky._instances = [];
    $.fn.sticky.updateAll = updateAll;
    $(win).on({
        resize() {
            updateAll();
        },
        scroll() {
            const len = $.fn.sticky._instances.length;
            for (let i = 0; i < len; i++) {
                const element = $.fn.sticky._instances[i];
                if (!element._frozen) {
                    element.moveIt();
                }
            }
        },
    });
    $(win.document).on({
        ready() {
            win.setInterval(function() {
                requestFrame(function() {
                    const len = $.fn.sticky._instances.length;
                    for (let i = 0; i < len; i++) {
                        const element = $.fn.sticky._instances[i];
                        if (element._parentHeight !== element.parent[0].offsetHeight) {
                            element.update();
                        }
                    }
                });
            }, 1e3);
        },
    });
})(jQuery, window);