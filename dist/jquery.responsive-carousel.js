/** 
 * Responsive carousel - v0.1.0 - 2015-04-23
 * https://github.com/debijenkorf/responsive-carousel
 * Copyright (c) 2015 De Bijenkorf 
 * Licensed MIT, GPL 
 */


var DBK = window.DBK || {};

DBK.render = (function ( domPrefixes, window, document ) {

	// avoid re-loading same library twice
	if (typeof(DBK.render) == 'object' && typeof(DBK.render.LOADED) != 'undefined') {
		return; 
	}

	var vendors = domPrefixes;

	/**
	 * Description
	 * @method publicGetVendorPropertyName
	 * @param {} property
	 * @return _property
	 */
	var publicGetVendorPropertyName = function ( property ) {

		var _property       = property,
			_vendorProperty = _property.charAt(0).toUpperCase() + _property.slice(1);

		for (var i = 0; i < vendors.length && !document.body.style[_property]; ++i) {

			if (typeof (document.body.style[vendors[i] + _vendorProperty]) !== 'undefined') {
				return vendors[i] + _vendorProperty;
			}
		}

		return _property;

	};

	// public
	return {
		'vendorPropertyName' : publicGetVendorPropertyName,
		'LOADED' : true
	};

})( window.Modernizr._domPrefixes, window, document );

// the semi-colon before the function invocation is a safety
// net against concatenated scripts and/or other plugins
// that are not closed properly.
;(function ( Render, Modernizr, $, window, document, undefined ) {
 
	// undefined is used here as the undefined global
	// variable in ECMAScript 3 and is mutable (i.e. it can
	// be changed by someone else). undefined isn't really
	// being passed in so we can ensure that its value is
	// truly undefined. In ES5, undefined can no longer be
	// modified.

	// window and document are passed through as local
	// variables rather than as globals, because this (slightly)
	// quickens the resolution process and can be more
	// efficiently minified (especially when both are
	// regularly referenced in our plugin).

	// Create the defaults once
	var pluginName = 'carousel',
		defaults = {
			ctrlBtnPrev : '.dbk-carousel-control-btn_previous',
			ctrlBtnNext : '.dbk-carousel-control-btn_next',
			carouselUl	: '.dbk-carousel-wrapper > ul',
			populateImagesAfterEvent : false
		};

	/**
	 * The actual plugin constructor
	 * @method Plugin
	 * @param {} element
	 * @param {} options
	 * @return 
	 */
	function Plugin( element, options ) {

		this.element = element;
		this.$element = $(element);

		// jQuery has an extend method that merges the
		// contents of two or more objects, storing the
		// result in the first object. The first object
		// is generally empty because we don't want to alter
		// the default options for future instances of the plugin
		this.options = $.extend( {}, defaults, options) ;

		this.init();
	}

	Plugin.prototype = {

		/**
		 * Initialization logic
		 * @method init
		 * @return 
		 */
		init : function () {
			// Place initialization logic here
			// We already have access to the DOM element and
			// the options via the instance, e.g. this.element
			// and this.options

			// check if we have a element hook
			if(!this.$element.get(0)){
				// if not then stop execution
				return;
			}

			// Hook carousel list
			this.$ul = this.$element.find(this.options.carouselUl);
			this.ul  = this.$ul.get(0);

			// check if we have a element hook
			if(this.ul.children.length < 1){
				// if not then stop execution
				return;
			}

			// Hook controls
			this.$ctrlBtnPrev = this.$element.find(this.options.ctrlBtnPrev);
			this.$ctrlBtnNext = this.$element.find(this.options.ctrlBtnNext);

			// Constants
			// Get browser vendor transform property
			this.transformProperty     = Render.vendorPropertyName('transform');
			this.transitionendProperty = Render.vendorPropertyName('transitionend');

			// Swipe treshold before default prevented
			this.swipeThreshold = 5; // Pixels

			// Needed for calculating the distance for auto translation
			this.timeConstant = 325; // Ms

			// If true, content is rendered after carousel events are triggered
			this.populateImagesAfterEvent = this.options.populateImagesAfterEvent;

			// Start initializing behaviour, bindings and render interface
			this.initProperties();
			this.renderInterface();
			this.bindEvents();

			// Toggle visibility of current carousel
			this.toggleVisibility( this.$element.parents('.dbk-row.clearfix') );

			// Communicate to observer that the carousel has been updated
			this.$element.trigger('carousel:initialized', [this.ul, this.$ul]);
		},

		/**
		 * Initialize carousel properties
		 * @method initProperties
		 * @return 
		 */
		initProperties : function () {


			// Set list item properties
			this.liWidth = this.ul.children[0].offsetWidth; // clientWidth
			this.liCount = this.ul.children.length; // Amount of items in list

			// Set list properties
			this.ulWidth = this.liWidth * this.liCount;

			// Set maximum list items that can be viewed in list
			this.maxLiItems = Math.floor(this.ul.parentElement.offsetWidth / this.liWidth);

			// Set list wrapper properties
			this.wrapperWidth = this.maxLiItems * this.liWidth;

			// Set x-axis position for animation
			this.xPosition = 0;
			this.rasterPosition = 0;

			// Calculate list items that remains after all full cycles
			this.deltaLiCount = this.liCount % this.maxLiItems;
			this.deltaEvent   = this.deltaLiCount === 0 ? false : true;

			// Current cycle
			// Updates after every full cycle animation
			this.currentCycle = 1;

			// Touch variables
			this.touchCoordX  = 'undefined';

			// Boolean to check movement
			this.moved = false;

			this.cancelKinetic = false;
		},

		/**
		 * Set style properties on the list and its wrapper
		 * @method renderInterface
		 * @return 
		 */
		renderInterface : function () {

			var _ulCss = { 'width': this.ulWidth, 'height': 'auto' };

			if ( this.liCount <= this.maxLiItems ) {
				_ulCss = { 'width': this.ulWidth, 'height': 'auto', 'float': 'none', 'margin': '0 auto' };

			} else {
				this.toggleVisibility(this.$ctrlBtnPrev);
				this.toggleVisibility(this.$ctrlBtnNext);
			}

			// Set list dimensions
			this.$ul.css(_ulCss);

			// Calculates the width of the wrapper around the list
			// so it gets perfectly centered
			this.$ul.parent().css({
				'width': this.wrapperWidth
			});

			this.updateCtrlStatus();
		},

		/**
		 * Bind click and touch events
		 * @method bindEvents
		 * @return 
		 */
		bindEvents : function () {

			this.toggleCtrlEvent( this.$ctrlBtnPrev, 'prev' );
			this.toggleCtrlEvent( this.$ctrlBtnNext, 'next' );

			if (!!Modernizr.touch) {
				this.$ul.on('touchstart.carousel', $.proxy(this.setXPosition, this));
				this.$ul.on('touchmove.carousel',  $.proxy(this.translateTouch, this));
				this.$ul.on('touchend.carousel',   $.proxy(this.touchend, this));

				this.$ul.on( this.transitionendProperty + '.carousel',   $.proxy(this.transitionend, this));
			}

			$(document).on('smartresize.carousel', $.proxy(this.reset, this));
		},

		/**
		 * Description
		 * @method toggleCtrlEvent
		 * @param {} $element
		 * @param {} type
		 * @return 
		 */
		toggleCtrlEvent : function ( $element, type ) {

			var _$element = $element,
				_type     = type;

			if ( !!_$element.hasClass('fade') && !_$element.hasClass('in') ) {
				_$element.off('click.carousel');
			}

			if ( !!_$element.hasClass('fade') && !!_$element.hasClass('in') ) {
				if ( _type == 'prev') {
					_$element.on('click.carousel', $.proxy(this.prev, this));
				}
				if ( _type == 'next') {
					_$element.on('click.carousel', $.proxy(this.next, this));
				}
			}

		},

		/**
		 * Description
		 * @method toggleVisibility
		 * @param {} $element
		 * @return 
		 */
		toggleVisibility : function ( $element ) {

			var _$element = $element;

			if ( !!_$element.hasClass('fade') && !_$element.hasClass('in') ) {
				_$element.addClass('in');
			}

		},

		/**
		 * Description
		 * @method triggerUpdateEvent
		 * @return 
		 */
		triggerUpdateEvent : function () {
			// Communicate with observer
			// Makes sure data is being retrieved
			if (!!this.populateImagesAfterEvent) {
				this.$element.trigger('carousel:update', [this.ul, this.$ul]);
				this.populateImagesAfterEvent = false; 
			}
		},

		/**
		 * Toggles buttons on or off
		 * @method updateCtrlStatus
		 * @return 
		 */
		updateCtrlStatus : function () {

			if ( -this.ulWidth < this.xPosition ) {
				this.$ctrlBtnPrev.removeClass('disabled');
				this.$ctrlBtnNext.removeClass('disabled');
			}

			// Disable previous button on start
			if ( this.xPosition === 0 ) {
				this.$ctrlBtnPrev.addClass('disabled');
			}

			// Disable next button on end
			if ( -this.ulWidth == (this.xPosition - ( this.maxLiItems * this.liWidth )) ) {
				this.$ctrlBtnNext.addClass('disabled');
			}
		},

		/**
		 * When we hit one of the buttons
		 * @method toggleDelayClass
		 * @param {} eventType
		 * @return 
		 */
		toggleDelayClass : function ( eventType ) {

			if ( !this.$ul.hasClass('no-delay') && (eventType == 'touchmove') ) {
				this.$ul.addClass('no-delay');
			}

			if ( !!this.$ul.hasClass('no-delay') && (eventType == 'click' || eventType == 'touchend') ) {
				this.$ul.removeClass('no-delay');
			}
		},

		/**
		 * Description
		 * @method touchend
		 * @param {} event
		 * @return 
		 */
		touchend : function ( event ) {
			event.preventDefault();

			// Navigate to target element if no transition
			// took place
			if (!this.moved) {
				event.target.click();
				return;
			}

			//console.log('end', event.originalEvent.changedTouches[0].pageX);
			this.$ul.addClass('no-delay');

			var _target,
				_currentPos = this.xPosition;

			clearInterval(this.ticker);
			if (this.velocity > 1000 || this.velocity < -1000) {
				this.amplitude = 0.8 * ( this.velocity / 5 );

				_target = Math.round(event.originalEvent.changedTouches[0].pageX + this.amplitude);

				this.timestamp = Date.now();
				this.autoTranslate(_target, _currentPos);
			} else {
				this.snapToGrid();
			}

		},

		/**
		 * Description
		 * @method snapToGrid
		 * @return 
		 */
		snapToGrid : function ( ) {

			//this.touchCoordX    = this.touchCoordX + event.originalEvent.changedTouches[0].pageX;
			this.rasterPosition = Math.round(this.xPosition / this.liWidth); // Items that have been translated
			this.currentCycle   = Math.floor((-this.rasterPosition + this.maxLiItems) / this.maxLiItems);

			// Set easing transition
			//this.toggleDelayClass(event.type);
			this.$ul.removeClass('no-delay');

			// Exceeded start point (this.xPosition has a plus value)
			if ( this.xPosition > 0 || this.liCount < this.maxLiItems ) {
				// Start all over
				this.reset();

				// Proceed with translate
				this.translate('touch', 0);
				return;
			}

			// Exceeded maximum distance
			if ( this.xPosition < (-this.ulWidth + this.wrapperWidth) ) {

				// Position in raster can not exceed the amount of list items
				// Thus we reset this value
				this.rasterPosition = -this.liCount;

				// Proceed with translate
				this.translate('touch', (-this.ulWidth + this.wrapperWidth));
				return;
			}

			// Distance is in between start and maximum
			// Snap to grid, proceed with translate
			this.translate('touch', ( this.rasterPosition * this.liWidth ));

		},

		/**
		 * Set position X-axis
		 * @method setXPosition
		 * @param {} event
		 * @return 
		 */
		setXPosition : function ( event ) {
			event.preventDefault();

			//console.log('start', event.originalEvent.changedTouches[0].pageX);

			// We use a periodic timer to track the velocity while the user is 
			// still dragging. When the timer fires, retrieve the current 
			// position and use it to compute the velocity. 
			// Empirically, tracking the position 10 times per second 
			// (a timer interval of 100 ms) proves to be sufficient.
			this.velocity  = this.amplitude = 0;
			this.frame     = event.originalEvent.changedTouches[0].pageX;
			this.timestamp = Date.now();

			// Unset and set after each tap
			clearInterval(this.ticker);
			this.ticker = setInterval(this.calculateVelocity, 100);

			// General
			this.moved = false;
			this.touchCoordX = event.originalEvent.changedTouches[0].pageX - this.xPosition;

			this.triggerUpdateEvent();
		},

		/**
		 * Description
		 * @method autoTranslate
		 * @param {} target
		 * @param {} currentPosition
		 * @param {} deltaTwo
		 * @return 
		 */
		autoTranslate : function ( target, currentPosition, deltaTwo ) {

			var _elapsed,
				_delta,
				_distance,
				_target     = target,
				_currentPos = currentPosition;

			if ( !!this.cancelKinetic ) {
				_delta = 0;
				return;
			}

			// The launch velocity is used to compute where the translation needs to stop, 
			// this is the purpose of the amplitude variable.
			if (this.amplitude) {
				_elapsed  = Date.now() - this.timestamp;
				_delta    = -this.amplitude * Math.exp(-_elapsed / this.timeConstant);
				_distance = !!isNaN(deltaTwo) ? 0 : (_delta - deltaTwo);

				if ( this.xPosition < (-this.ulWidth + this.wrapperWidth - this.liWidth) || this.xPosition > this.liWidth) {
					_delta = 0;
				}

				// console.log(_delta, _target, _currentPos, _distance);
				if ( _delta > 0.6 || _delta < -0.6 ) {

					this.translate('kinetic', _distance);

					window.requestAnimationFrame( $.proxy( function() {
						this.autoTranslate( _target, _currentPos, _delta );
					}, this) );

				} else {
					// Snap to grid
					this.snapToGrid();
				}
			}
		},

		/**
		 * The launch velocity is used to compute where the translation needs to stop, 
		 * this is the purpose of the amplitude variable.
		 * @method calculateVelocity
		 * @param {} offset
		 * @return 
		 */
		calculateVelocity : function ( offset ) {

			var _now,
				_elapsed,
				_delta,
				_v,
				_offset = offset;

			// Set a new date to calculate the
			// time that has been elapsed
			_now = Date.now();

			// Time that has elapsed
			// The first timestamp(this.timestamp) has been set after
			// the first tap (this.setXposition)
			_elapsed = _now - this.timestamp;


			this.timestamp = _now;
			_delta = _offset - this.frame;
			this.frame = _offset;

			// The launch velocity is used to compute where the translation needs to stop, 
			// this is the purpose of the amplitude variable. The factor 0.8 is tweakable. 
			// If you want to make the list feel "heavy" reduce the number. 
			// Consequently, a higher factor will give the illusion of a smooth and 
			// frictionless list. Updating the translate offset is the responsibility 
			// of autoTranslate() function.
			_v = 1000 * _delta / (1 + _elapsed);
			this.velocity = 0.8 * _v + 0.2 * this.velocity;
		},

		/**
		 * Description
		 * @method translateTouch
		 * @param {} event
		 * @return 
		 */
		translateTouch : function ( event ) {

			this.toggleDelayClass(event.type);

			var _deltaDistance = -(this.touchCoordX - event.originalEvent.changedTouches[0].pageX);

			this.calculateVelocity(event.originalEvent.changedTouches[0].pageX);

			// Check if swipe passes treshold
			if ( _deltaDistance > this.swipeThreshold || _deltaDistance < -this.swipeThreshold ) {
				event.preventDefault();

				this.cancelKinetic = false;
				this.moved = true;
				this.translate('touch', _deltaDistance);
			}

		},

		/**
		 * Calculates transitions over x-axis
		 * @method translate
		 * @param {} direction
		 * @param {} distance
		 * @return 
		 */
		translate : function ( direction, distance ) {

			var _distance = typeof(distance) !== 'undefined' ? distance : this.wrapperWidth;

			if ( direction == 'previous' || direction == 'kinetic' ) {
				this.xPosition += _distance;
			} else if ( direction == 'next' ) {
				this.xPosition -= _distance;
			} else if ( direction == 'touch' ) {
				this.xPosition = _distance;
			}

			// Trigger GPU if possible
			if (!!Modernizr.csstransforms3d) {
				this.$ul.css( this.transformProperty, 'translate3d(' + this.xPosition + 'px, 0 ,0)');
			} else {
				this.$ul.animate({left: this.xPosition + 'px'});
			}

			this.updateCtrlStatus();
		},

		/**
		 * Description
		 * @method transitionend
		 * @param {} event
		 * @return 
		 */
		transitionend : function ( event ) {

			event.preventDefault();
			event.stopPropagation();

			if ( event.target == this.ul ) {
				this.snapToGrid();
				this.cancelKinetic = false;
			}

		},

		/**
		 * Description
		 * @method getControlProperties
		 * @param {} direction
		 * @return 
		 */
		getControlProperties : function ( direction ) {

			var _direction = direction;

			// (Re)set properties
			this.rasterPosition = Math.round(this.xPosition / this.liWidth); // Items that have been translated
			this.currentCycle   = Math.floor((-this.rasterPosition + this.maxLiItems) / this.maxLiItems);
			this.deltaLiCount   = ( this.liCount + this.rasterPosition ) % this.maxLiItems;

			// Calculate previous control properties
			if ( _direction == 'previous' ) {

				// Calculate delta items left
				if ( -this.rasterPosition < this.maxLiItems ) {
					this.deltaEvent = true;
				} else {
					this.deltaEvent = false;
				}

				return;

			// Calculate next control properties
			} else if ( _direction == 'next' ) {

				// Calculate delta items right
				if ( (this.liCount - ( -this.rasterPosition + this.maxLiItems )) < this.maxLiItems ) {
					this.deltaEvent = true;
				} else {
					this.deltaEvent = false;
				}

			}

		},

		/**
		 * Description
		 * @method prev
		 * @param {} event
		 * @return 
		 */
		prev : function ( event ) {
			event.preventDefault();

			this.cancelKinetic = true;
			this.toggleDelayClass(event.type);
			this.getControlProperties('previous');

			if ( this.xPosition === 0) {
				return;
			}

			// Run a full cycle
			if (!this.deltaEvent) {
				this.translate('previous');
				this.currentCycle--;
				return;
			}

			// Run delta items and reset
			this.translate('previous', ( this.deltaLiCount * this.liWidth ));
			this.reset();
			this.updateCtrlStatus();
		},

		/**
		 * Description
		 * @method next
		 * @param {} event
		 * @return 
		 */
		next : function ( event ) {
			event.preventDefault();

			this.cancelKinetic = true;
			this.toggleDelayClass(event.type);
			this.getControlProperties('next');

			if ( this.xPosition == (-this.ulWidth + this.wrapperWidth) ) {
				return;
			}

			this.triggerUpdateEvent();

			if (!this.deltaEvent) {
				this.translate('next');
				this.currentCycle++;
				return;
			}

			this.translate('next', ( this.deltaLiCount * this.liWidth ));
		},

		/**
		 * Remove attributes that where added after
		 * DOM ready
		 * @method removeAttributes
		 * @return 
		 */
		removeAttributes : function () {
			this.ul.parentElement.removeAttribute('style');
			this.ul.removeAttribute('style');
			this.ul.removeAttribute('class');

			this.$ctrlBtnPrev.removeClass('in');
			this.$ctrlBtnNext.removeClass('in');
		},

		/**
		 * Remove all DOM manipulated styling
		 * Set Dom manipulated styling
		 * @method reset
		 * @return 
		 */
		reset : function () {
			this.removeAttributes();
			this.initProperties();
			this.renderInterface();
		},

		/**
		 * Remove DOM manipulated styling
		 * and event references
		 * @method destroy
		 * @return 
		 */
		destroy : function () {

			this.removeAttributes();

			this.toggleCtrlEvent( this.$ctrlBtnPrev );
			this.toggleCtrlEvent( this.$ctrlBtnNext );

			// Remove touch event references if we use
			// a touch device
			if (!!Modernizr.touch) {
				this.$ul.off('touchstart.carousel');
				this.$ul.off('touchmove.carousel');
				this.$ul.off('touchend.carousel');

				this.$ul.off( this.transitionendProperty + '.carousel' );
			}

			$(document).off('smartresize.carousel');

			//Log.debug('Carousel: Destroyed...');
		}

	};

	/**
	 * A really lightweight plugin wrapper around the constructor,
	 * preventing against multiple instantiations and allowing for
	 * execution of internal piblic methods
	 * @method pluginName
	 * @param {object} options
	 * @return 
	 */
	$.fn[pluginName] = function ( options ) {

		var args = arguments;

		// if options are undefined or an object run the normal init
		if ( options === undefined || typeof(options) === 'object') {
			return this.each(function () {
				if (!$.data(this, 'plugin_' + pluginName)) {
					$.data(this, 'plugin_' + pluginName,
					new Plugin( this, options ));
				}
			});
		} else if ( typeof(options) === 'string' && options[0] !== '_' && options !== 'init') {

			// Cache the method call
			// to make it possible
			// to return a value
			var returns;

			this.each(function () {
				var instance = $.data(this, 'plugin_' + pluginName);

				// Tests that there's already a plugin-instance
				// and checks that the requested public method exists
				if (instance instanceof Plugin && typeof instance[options] === 'function') {

					// Call the method of our plugin instance,
					// and pass it the supplied arguments.
					returns = instance[options].apply( instance, Array.prototype.slice.call( args, 1 ) );
				}

				// Allow instances to be destroyed via the 'destroy' method
				if (options === 'destroy') {
					$.data(this, 'plugin_' + pluginName, null);
				}

				// If the earlier cached method
				// gives a value back return the value,
				// otherwise return this to preserve chainability.
				return returns !== undefined ? returns : this;
			});

		}

	};

})( DBK.render, window.Modernizr, jQuery, window, document );