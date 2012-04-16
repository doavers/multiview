/*
* jQuery Mobile Framework : "multiview" plugin
* Copyright (c) Sven Franck
* Dual licensed under the MIT or GPL Version 2 licenses.
* Version 12.04.2012 
*/
		
(function( $, window) {	
	
	$.widget("mobile.multiview",$.mobile.widget, {
		
		options: {			
			
			// This will show the menu/mid! toggle buttons in splitview mode
			switchable: false,			
			switchableHideOnLoad: false,
			
			// Config popover menu button		
			menuTxt: 'Menu',
			menuBtnTheme: 'a',
			menuBtnIcon: 'gear',
			menuBtnIconPos: 'left',
			
			// Config popover mid button
			midTxt: 'Mid',
			midBtnTheme: 'a',
			midBtnIcon: 'gear',
			midBtnIconPos: 'left',		
			
			// Menu Dimensions
			menuWidth: '25%',
			menuMinWidth: '250px',
			
			// Mid Dimensions
			// TODO: Project
			midWidth: '25%',
			midMinWidth: '250px',
			
			// Main Dimensions - takes up the remaining space 
						
			// Deeplink sitemap
			// When deeplinking to a panel page, plugin does not know, in which panel/viewport page goes
			// This should be a siteMap/history sort-of index, which the plugin will check on deeplinks, 
			// in case the page to be loaded is NOT "on board"
			// TODO: not implemented
			externalSiteMap: [ ["#id", "url", "panel"] ],
								
			// DEPRECIATED: mimic JQM $ignoreNextHashChange
			// $ignoreMyOwnNextHashChange : false,
			
			// DEPRECIATED: block hashChange firing panelTransitions
			// $ignoreNextPageBeforeChange: false,
									
			// DEPRECIATED:  make hashChange backward transitions sure to pass ignoreMyOwnNextHashChange
			// $hashJoker:0,	
				
			// DEPRECIATED:  need this if pagination plugin is used
			// $blockPaginationHashChange: false,			
			
			// DEPRECIATED:  avoid endless loops on panel transitions
			// $infinity: '',
													
			// DEPRECIATED: block hashChanges originating from crumbs back-button
			// $crumbsBlockStackUp: false,
			
			// DEPRECIATED: allow crumbs induced backwards transitions to pass hashchange blockers
			// $allowCrumbsHashToPass:false,
						
			// remember stack length at init
			$jqmHistoryStackAtInit:'',
			
			// store click events
			$stageEvent: '',
			
			// block scrollTop on transitions inside a popover
			$panelTransBlockScrollTop:'',
			
			// window history at first load
			$windowHistoryAtInit: window.history.length,					

			// in case history at init is already at max
			$windowHistoryManualCounter: 0,
			
			// block 2nd hashchange on context transitions
			$contextBlockNextHashChange:'',
			
			// block popover panel closing on a context transition
			$blockContextScrollTop:'',
			
			// threshold screen widths			
			$lowerThresh: 320,						
			$upperThresh: 768, 
			//   0px - 320px 	= "small"	fullscreen-mode 
			// 320px - 768px	= "medium"	popover-mode, yield-mode or offset-mode
			// 768px - 			= "large"	splitview-mode 
			
			// Android multi-click-prevent
			$blockMultiClick: false				
						
		},

/* -------------------------------------- PLUGIN SETUP -------------------------------------- */		

		_create: function() {		
			
			// --- PURPOSE ---		
			// 1. Setup plugin
						
			// --- CALLED FROM ---
			// 1. from plugin trigger
			 
			
			// --- UPDATES ---
			// 	
			
			// --- TODO ---
			// 
			
			var self = this, 
				baseClasses = $.support.touch ? 'touch multiview ui-plain-mode' : 'multiview ui-plain-mode', 
				blkLst = $.mobile.fixedtoolbar.prototype.options.supportBlacklist() && $.support.scrollTop ? 'blacklist' : '',
				hist;
			
			$('html')
					// base 
					.addClass( baseClasses )
					
					// blacklist
					.addClass( blkLst )
					
					.data({
						// history base
						'backAtBase':true, 
						// set click flag
						'clickInProgress':false
						});		
			
			// class for overthrow mode
			if ( $('div:jqmData(scrollmode="overthrow")').length > 0 ) {
				$('html').addClass('overthrow-mode')
				}		
			
			// store JQM stack height as fallback
			self.options.$jqmHistoryStackAtInit = $('div:jqmData(wrapper="true")').jqmData('external-page') == true ? $.mobile.urlHistory.stack.length : 1;									
				
			// set active index right away to prevent error on first back transition in iOS3
			// TODO: remove this again...
			$.mobile.urlHistory.activeIndex = self.options.$jqmHistoryStackAtInit;
					
			// setup panel history stacks
			$(document).on('pagecreate', 'div:jqmData(role="page").basePage', function() {								
				$('div:jqmData(hash="history")').each(function() {			
				
					hist = $(this);	
				
					// this should only fire if history is off or undefined. If you start from a multiview page, all data-hash="history" panels' stacks are initiated
					// they stay active until the page is dropped from the DOM. If you go back, then they are re-initiated again.
					// if the respective page is the first page in the DOM, the history simply stays active, so "going" to another page and coming back does not 
					// trigger a history-stack re-initialization									
					if ( hist.data("history") == "off" || typeof hist.data("history") == 'undefined' ) {											
						hist.data("history", "on");					
						hist.data("stack", []);
						hist.data("stack").push('#'+hist.find('div:jqmData(show="first")').attr('id'));												
						}
					});
				});		
				
			// global bindings					
			self._popoverBindings();
			self._mainEventBindings();	
			
		},
		
		setupMultiview: function(event, page) {		
			
			// --- PURPOSE ---		
			// 1. Runs once for every wrapper page - either loaded or pulled in
			// 2. Sets default flags for popover enhancement, panel history, caching
			// 3. Assigns global header/footer classes/padding 
			// 4. Enhances first pages on all panels, add activePageClass
			// 5. Sets Up Popovers on this wrapper page
			// 6. Fire splitscreen to setup splitview/popover/...
			// 7. Fires general function, needed if there are no panels on the page, too
						
			// --- CALLED FROM ---
			// 1. pagebeforeshow on pages, only triggered on wrapper-pages, only triggered once per wrapper page
			 
			
			// --- UPDATES ---
			// 	
			
			// --- TODO ---
			// clean up code
			
			var self = this;				
			
			page																				
				.addClass( $.mobile.activePageClass )
				
				// add viewports
				.find("div:jqmData(role='panel')").addClass('ui-mobile-viewport ui-panel').end()			
				
				// panel history flag
				.find("div:jqmData(hash='history')").data("history","off").end()			
				
				// popover flag
				.find("div:jqmData(panel='popover')").addClass("popEnhance").attr({'set':'off'}).end()
				
				// popover flag
				.closest('html.ui-popover-mode').find('div:jqmData(panel="menu")').addClass("popEnhance").attr({'set':'off'}).end()
				
				// caching flag
				.find("div:jqmData(role='page')").attr('data-internal-page', 'true').end()
				
				// assign data-url by hand for wrapper-pages pulled in externally
				// TODO: not nice, creates problems, when pages are pulled in which include nested pages.
				// TODO: remove this, if not needed
				.filter('div:jqmData(external="true")').find('div:jqmData(role="page")').each(function() {			
					$(this).attr('data-url', $(this).attr('id') );
					}).end()
							
				// activeClass first panel pages
				.find('div:jqmData(role="panel") div:jqmData(show="first")').addClass( $.mobile.activePageClass );		
				
				// enhance first panel pages
				// doesn't work chained - need to call page, otherwise fromPage.data("page") is undefined on first panel transition!
				page.find('div:jqmData(role="panel") div:jqmData(show="first")').each( function() {				
					$(this).page();
					});				
				
			// init popovers on wrapper page
			self._setupPopovers( page );
			
			// global header/footer classes and padding
			if ( page.find('div:jqmData(panel="main"), div:jqmData(panel="menu"), div:jqmData(panel="mid")').length > 0 ) {												
				
				page.children('div:jqmData(role="header"), div:jqmData(role="footer")').each( function() {
					var header = $(this).is( ".ui-header" );
					$(this).addClass( header ? 'ui-header-global' : 'ui-footer-global' )
							.attr( "data-position", page.jqmData("scrollmode") == "overthrow" ? "inline" : "fixed" );
					});
					
				// fire splitScreen	
				self.splitScreen("init");	
				}	
				
			// fire display mode set and page "make-up"
			self.gulliver();
			// self.panelWidth();						
			self.panelHeight();	
				
			},

/* -------------------------------------- POPOVER HANDLER -------------------------------------- */
			
		_setupPopovers: function( page ) {
			
			// --- PURPOSE ---		
			// 1. add classes triangles, handle autoshow option (= show popover once, the first time the page loads	

						
			// --- CALLED FROM ---
			// 1. setupMultiview - fires once for every wrapper page
			 			
			// --- UPDATES ---
			// 	JQM 1.1 RC2
						
			page.find(".popEnhance").each(function(i) {		
				
				var pop = $(this);

				if ( pop.attr('set') == 'off' ) {
										
					pop
						// flag
						.jqmData('set','ok')
						// clean up trigger
						.removeClass( "popEnhance" )
						// triangles
						.addClass("ui-triangle-"+pop.jqmData("triangle") )
						// append
						.filter( ".ui-triangle-top").append('<div class="popover_triangle" />').end()
						// prepend
						.filter( ".ui-triangle-bottom" ).prepend('<div class="popover_triangle" />').end();					
					
					// autoshow
					if ( pop.jqmData("autoshow") == "once") {							
						
						// show panel
						window.setTimeout(function() {										
							page.find(".toggle_popover:jqmData(panel='"+pop.jqmData('id')+"'):eq(0)").click();							
							},10);
						
						// remove autoshow from DOM!
						pop.jqmRemoveData("autoshow").removeAttr('data-autoshow');																	
						}													
					}
				});
			
		},
		
		// popover panels toggle routine
		_popoverBindings: function() {
			
			// --- PURPOSE ---		
			// determines when to close a popover panel
						
			// --- CALLED FROM ---
			// _create - will only be called and sets all listeners
			 
			
			// --- UPDATES ---
			// JQM 1.1 RC2 - adapted to main/mid/menu panel	
			
			// --- TODO ---
			// 
			
			var self = this, $nope,								
				solo = false;	
			
			// (1) close button
			$(document).on('click','a.closePanel', function () {				
				self.hideAllPanels("#1");				
				});	
			
			// (2) scrollstart panels (overthrow mode) 
			if ( $('html').hasClass('overthrow-mode') ) {				
				
				// this is hard to get to work with overthrow. just does not fire a lot.
				$('.ui-content').on('scrollstart', function() {
											
					if ( $('html').hasClass('ui-splitview-mode') && $(this).closest('div:jqmData(panel="main"), div:jqmData(panel="mid"), div:jqmData(panel="menu")').length > 0 ||
							$('html').hasClass('ui-popover-mode') && $(this).closest('div:jqmData(panel="main")').length > 0 ) {
								
								// prevent iOS keyboard hiding popover				
								if ( !$("input:focus").length > 0  ) {					
									self.hideAllPanels("#2");
									}
						}					
					});
				}
				
			// (3) scrollStart document
			$(document).on('scroll', function(){
				// only hide if not in fullscreen mode, no blocker has been set (necessary 
				// if new pages are appended to DOM - can't find scrollTop 
				// to block) or if this is a "scrollTop" initiated from a context transition 
				// (need to keep the initiating popover active)													
				if ( !$('html').hasClass('ui-fullscreen-mode') && self.options.$panelTransBlockScrollTop == false && !self.options.$blockContextScrollTop == true) {																							
					
					// prevent iOS keyboard hiding popover						
					if ( !$("input:focus").length > 0 ) {
						self.hideAllPanels("#3");
						}
					// reset for next;
					self.options.$panelTransBlockScrollTop == true; 
					}
				self.options.$blockContextScrollTop = '';
				});
				
			// (4) click/tap wrapper
			$(document).on('click tap', function(event) {	
			
				$nope = $('div:jqmData(panel="popover"), .ui-popover-mode div.pop_menuBox, .ui-popover-mode div.pop_midBox, .mmToggle, .toggle_popover');
								
				// stop if click is on popover and popover-toggle button
				// or the menu or mid in popover mode
				// or any custom select menus firing up... this list is getting to long.				
				if ( $(event.target).closest( $nope ).length > 0 ) {											
					return; 
					}
					
				// make sure it only fires once			
				if ( solo == false ) {					
					solo = true;
					self.hideAllPanels("#4");
					window.setTimeout(function() { solo = false; },500);
					}
				
			});
			
			// (5) changePage on main, menu, mid in splitview-mode or main in popover-mode
			// TODO: IMPROVE, bind to event, check for target 
			$(document).on('pagebeforehide', '.ui-splitview-mode div:jqmData(wrapper="true").ui-page-active div:jqmData(panel="main") div.ui-page-active, .ui-splitview-mode div:jqmData(wrapper="true").ui-page-active div:jqmData(panel="menu") div.ui-page-active, .ui-splitview-mode div:jqmData(wrapper="true").ui-page-active div:jqmData(panel="mid") div.ui-page-active, .ui-popover-mode div:jqmData(wrapper="true").ui-page-active div:jqmData(panel="main") div.ui-page-active' ,function(event) {
														
				// not if this is because of a context transition							
				if ( self.options.$contextBlockNextHashChange == false) {					
					self.hideAllPanels("#5");
					}
				});
		
		
			// (6) click of a link on a panel, which loads a page on another panel
			// need this in fullscreen mode to close a page on panel 1 when loading a page in panel 2
			$(document).on('click','div:jqmData(role="panel") a', function () {								

				if ( $('html').hasClass('ui-fullscreen-mode') && $(this).jqmData('panel') != $(this).closest('div:jqmData(role="panel")').jqmData('id') ){																							
					self.hideAllPanels("#6");
					}

				});
				
			// (7) on orientationchange
			// breaks deeplinks, no clue why
			// $(window).on('orientationchange', function(event){ 
			// 		self.hideAllPanels("#7");
			// 		});			 
		
			},
				
		// hide panels
		hideAllPanels: function(from) {
			
			// --- PURPOSE ---		
			// close popovers, which can either be a regular popover or a menu/mid panel in popover or fullscreen mode
						
			// --- CALLED FROM ---
			// 1. clicking toggle button (OK)
			// 2. scrollStart on panels - splitview-mode: mid/menu/main, popover-mode: main (OK)
			// 3. scrollStart document (OK)
			// 4. click/tap wrapper page (OK)
			// 5. changePage splitview-mode: main/mid/menu, popover-mode: main
			// 6. click a link on panel A which loads a page in panel B in fullscreen mode
			// (7. orientationchange - not active, because it breaks deeplinks, no idea why )
			// 8. clicking toggle button of active popover - closes this popover - from inside showPanel() (OK)
			// 9. clicking toggle button of inactive popover - closes all other popovers - from inside showPanel() (OK)
			 
			
			// --- UPDATES ---
			// JQM 1.1 RC2 - adapted to main/mid/menu panel	
			
			// --- TODO ---
			// 
		
			var self = this; 
			
			// clear button
			$('.toggle_popover').removeClass('ui-btn-active');	
			
			// panel loop
			$("div:jqmData(panel='popover'), .ui-popover-mode div:jqmData(panel='menu'), .ui-popover-mode div:jqmData(panel='mid'), .ui-fullscreen-mode div:jqmData(panel='menu'), .ui-fullscreen-mode div:jqmData(panel='mid')").each(function(index) {
				
				var $pop = $(this);
				
				if( $pop.is(':visible') ) {
					// pop transition
					$pop.addClass('reverse out')
						.hide('fast')	
						// clean up active classes
						.removeClass('ui-panel-active')								
							.find(".ui-page-active")
								.not("div:jqmData(show='first')")
								.removeClass('ui-page-active').end()
							.find(".ui-btn-active")
								.removeClass('ui-btn-active');																								
			
					// fullscreen handler
					if ( $('html').hasClass('ui-fullscreen-mode') ) {
						
						//reactivate background panels
						$('.ui-panel-hidden').removeClass('ui-panel-hidden');
			
						//reactivate background pages							
						$('.reActivate').addClass('ui-page-active').removeClass('reActivate');
						
						// reset background page height
						self.backgroundPageHeight( '', "clear" )
						}
			
					// clear panel history
					self.historyDump($pop);
					
					// unwind window.history
					self.browserReset();
							
					// drop pages pulled into the panel from DOM										
					$pop.find('div:jqmData(external-page="true")').remove();		
			
					// clean up bleed-through Android clicks
					$('.androidSucks').removeClass('ui-disabled androidSucks').removeAttr('disabled');
					
					} else {
						// make sure panel is gone... not sure why status sometimes is hidden with panels visible when navigating between wrapper pages
						$pop.css('display','none');
					}
				});
				// clean up pop() transition 
				window.setTimeout( function() {	
					// same as in showpanel. Transition depends on screen-mode. In splitview always use "Pop", in other view-mode (popover or fullscreen)
					// depending on data-yield being set, "pop" or "slide" is used					
					$('div:jqmData(role="panel")').removeClass('reverse out '+ ( $('div:jqmData(yieldmode="true")').length > 0 && !$('html').hasClass('ui-splitview-mode') ) ? 'slide' : 'pop');
					}, 350);					
		
			},
		
		showPanel: function(e, $el) {
			
			// --- PURPOSE ---		
			// 1. show a popover or switchable panel
						
			// --- CALLED FROM ---
			// 1. clicking a toggle_popover button
			// 2. there is a panel option data-autoshow="once", which also triggers a click on the toggle_popover button
			 			
			// --- UPDATES ---
			// 	JQM 1.1 RC2 - fiddle in middle panel
			//              - added dynamic popover repositioning / used JQM 1.0 fixed toolbar before. this is so much better!
			
			var self = this,
				$correspond = $el.jqmData("panel"),
				$popPanel = $('div:jqmData(id="'+$correspond+'")'),
				$wrap = $popPanel.closest('div:jqmData(wrapper="true")');
			
			if ( $popPanel.is(":visible") ) {																			

				if ( $popPanel.hasClass('switchable') && $wrap.jqmData('switchable') ) {
					
					// hide switchable 
					$popPanel.css('display','none').addClass("switched-hide");						
					// update panelWidth()
					self.panelWidth();
					
					} else {						
						// regular panel routine
						// (8) clicking on active popover button closes this popover
						self.hideAllPanels("#8");																		
						}
					
				} else {

					if ( $popPanel.hasClass('switchable') && $wrap.jqmData('switchable') ) {
						
						// show switchable 
						$popPanel.css('display','block').removeClass("switched-hide");	
						// update layout
						self.panelWidth();
						
						} else {								
							
							// regular panel routine
							// (9) clicking on a not-active trigger button closes all other popovers first
							self.hideAllPanels("#9");																											
							
							// center popover
							if ( $popPanel.hasClass('ui-popover-center') ){							
								$popPanel.css("left", (($(window).width() - $popPanel.outerWidth()) / 2) + $(window).scrollLeft() + "px");
								}
						
							
							// reposition popover before showing - based on jQuery Mobile fixedtoolbar polyfill - Author @scottjehl THANKS!
							
							$popPanel.jqmData("fixed") == "top" ? 
								$popPanel.css( "top", $( window ).scrollTop() + "px" ) :
									$popPanel.css( "bottom", $wrap.outerHeight() - $( window ).scrollTop() - $.mobile.getScreenHeight() + "px" );														
							
							// show popover
							$popPanel.not('.ui-splitview-mode div:jqmData(panel="menu"), .ui-splitview-mode div:jqmData(panel="mid")')
									//.attr('status', 'visible')
									.addClass('ui-panel-active '+ ( $('div:jqmData(yieldmode="true")').length > 0 && !$('html').hasClass('ui-splitview-mode') ) ? 'slide ' : 'pop '+' in')
									.show('fast')										
									.find('div:jqmData(show="first")')
										.addClass('ui-page-active');
							
							// clean up pop transition
							window.setTimeout( function() {									
								$popPanel.removeClass('in');							
								}, 350);																																																																						
								
							// fullscreen handler	
							if ( $('html').hasClass('ui-fullscreen-mode') ) {							
								
								// hide background panel, so popover does not drop below it							
								$('div:jqmData(panel="main").ui-panel-active').addClass('ui-panel-hidden');
								
								//remove all other active pages to make sure popover is visible $popPanel.find('.ui-page-active')	
								//assign a reActivate flag to activate pages again once this panel hides
								$('.ui-page-active')
										.not( "div:jqmData(wrapper='true'), div:jqmData(id='"+$correspond+"') .ui-page-active" )
										.addClass("reActivate")
										.removeClass('ui-page-active')																		
										
								// "fix" for Android bleeding through clicks... requires to disable background page buttons and 
								// inputs/selects while navigating overlay pages, otherwise click goes through to background page
								// http://code.google.com/p/android/issues/detail?id=6721								
								$('.ui-page').not( $popPanel.find('div:jqmData(role="page")') )
									.find(".ui-header").first().find(".ui-btn, input, select, textarea").addClass('ui-disabled androidSucks').attr('disabled','disabled')
								
								// and since Android never minds and disables everything... 
								$popPanel.find('.androidSucks').removeClass('ui-disabled androidSucks').removeAttr('disabled');										
																						
								// get active or data-show first page on the panel
								var activePage = $popPanel.find('.ui-page-active'),
									firstPage = $popPanel.find('div:jqmData(show="first")'),
									refPage = activePage.length > 0 ? activePage : firstPage;
									
								// tweak background page height	to enable natural scrolling
								self.backgroundPageHeight( refPage, "set" )
								}

							$el.addClass('ui-btn-active');				
							}				
					}
	
			},

/* -------------------------------------- BACK/MENU BUTTON HANDLER -------------------------------------- */
			
		
		crumble: function(event, data, page) {			
			
			// --- PURPOSE ---		
			// 1. create a back button after panel transitions have been made
			
			// --- CALLED FROM ---
			// 1. pagebeforeshow on panel pages (not wrapper page!)
						
			// --- UPDATES ---
			// JQM 1.1 RC2: merged controlgroup merging into setBtns()					          
			
			// --- TODO ---			
			// find alternative to panel history stack to get the previous page href
			
			var self = this, $prevPage,
				onPage = $( '#'+page.attr('id') ),
				$crumPanel = $( '#'+page.attr('id') ).closest('div:jqmData(role="panel")'),					
				
				$dropZone = onPage.find('div:jqmData(role="header")') || 
							onPage.closest('div:jqmData(wrapper="true").ui-page-active').children('div:jqmData(role="header")'),				
				
				$backUp = $crumPanel.data("stack").length;		
				
			// set button href - go back through the respective stack until first
			// entry not yield or onPage = current page is found
			for (i = $backUp-1; i>=0; i--) {					

				if ( $crumPanel.data("stack")[i] != "yield" && $crumPanel.data("stack")[i] != '#'+onPage.attr('id') ) {															
					var $prevPage = $crumPanel.data("stack")[i];						
					break;
					}					
				}	
			
			// if panel stack is > 1 it has a history, add button, unless it's the first page of panel
			if ( $backUp > 0 && onPage.jqmData("show") != "first")  {										
				
				var prevPageTitle = $( $prevPage ).find('div:jqmData(role="header") .ui-title'),
					prevText = prevPageTitle.length ? prevPageTitle.html() : $prevPage																				
										 								
				var panelID = $( '#'+onPage.attr('id') ).closest('div:jqmData(role="panel")').jqmData("id"), 					
					$theme = $header.jqmData('theme'),
					
					newButton = $( "<a href='"+$prevPage+"' class='ui-crumbs iconposSwitcher-a' title='back' data-rel='back' data-panel='"+panelID+"'>"+prevText+"</a>" ).buttonMarkup({										
									shadow: true,	
									corners: true,
									theme: $theme,
									iconpos: "left",
									icon: 'arrow-l'
									});				
	
					self.setBtns("add", $dropZone, newButton );
				}
		
			}, 				
				
		popoverBtn: function ( buttonType ) {
			
			// --- PURPOSE ---		
			// 1. Add the popover button(s). In case there is two panels, it will be one button to toggle the menu/mid panel. In case there are
			//    3 panels, this will be a controlgroup, to toggle either the menu or mid panel. In yield-mode, one option to switch between 
			//    panels are the popoverBtn, which no don't pop up the respective panel, but slide it in like another page... at least this is the plan.
			//    Alternatively panels out of view can be dragged. 
			
			// --- CALLED FROM ---
			// 1. popover() - in case it's a plain popover button
			// 2. splitscreen() - in case it's a switchable button to toggle menu/mid
			// 3. yield() - in case it's a yield button to slide in/out panels, which are out of view
						
			// --- UPDATES ---
			// JQM 1.1 RC2: 	added yield functionality, added mid-panel support	
			//              
			
			// --- TODO ---			
			// - Yield Mode Popover Button functionality
			// - create buttons/controlgroup dynamically
			// - how to manage space on small screens with 4-btn-controlgroups (BACK/HOME/Toggle Menu/Toggle Mid)
			// - fix controlgroup merging (c)
			
			var self = this,									
				$wrap = $('div:jqmData(wrapper="true").ui-page-active'),
				$menu = $wrap.find('div:jqmData(panel="menu")'),
				$mid = $wrap.find('div:jqmData(panel="mid")'),			
				$mdBt = '',
				$mnBt = '',				
				
				$globalHeader = $wrap.find('.ui-header-global'),
				$localHeader = $wrap.find('div:jqmData(panel="main") div:jqmData(role="page") .ui-header'),
				$flexPos = $wrap.find('div:jqmData(panel="main") div:jqmData(role="page") div:jqmData(drop-pop="true")'),
				
				// drop popover button whichever is found (in this order!) (1) user-specified location (2) global header (3) local headerS (4) pageS content				
				$dropZone = $flexPos.length ? 
					$flexPos : $globalHeader.length ? 
						$globalHeader : $localHeader.length ? 
							$localHeader : $wrap.find('div:jqmData(panel="main") .ui-content');
										
				// menu
				if ( $menu ) {					
					var $mnId = $wrap.find('div:jqmData(panel="menu")').jqmData('id'),
						$mnIc = $menu.jqmData('menu-icon') || self.options.menuBtnIcon,	
						$mnIp = $menu.jqmData('menu-iconpos') || self.options.menuBtnIconPos,
						$mnTh = $menu.jqmData('menu-theme') || self.options.menuBtnTheme,
						$mnTx = $menu.jqmData('menu-text') || self.options.menuTxt,
						// this is a button without corners and controlgroup classes, so it can be moved around in controlgroups... :-)
						// TODO: find a way to create this button dynamically - this does not work... 						
						/*
						$mnBt = $("<a href='#' data-inline='true' class='ui-crumbs popover-btn iconposSwitcher-a toggle_popover popToggle' title='back' data-panel='"+$mnId+"'>"+$mnTx+"</a>" ).buttonMarkup({										
									shadow: true,	
									corners: false,
									theme: $mnTh,
									iconpos: $mnIp,
									icon: $mnIc
									});
						*/			
						$mnBt = $('<a data-iconpos="'+$mnIp+'" data-inline="true" data-icon="'+$mnIc+'" data-role="button" href="#" data-panel="'+$mnId+'" data-theme="'+$mnTh+'" class="ui-btn-up-'+$mnTh+' ui-btn ui-btn-icon-'+$mnIp+' ui-shadow popover-btn iconposSwitcher-a toggle_popover mmToggle menuToggle"><span class="ui-btn-inner"><span class="ui-btn-text">'+$mnTx+'</span><span class="ui-icon ui-icon-'+$mnIc+' ui-icon-shadow"></span></span></a>');						
					}
					
				// mid
				if ( $mid ) {					
					var $mdId = $wrap.find('div:jqmData(panel="mid")').jqmData('id'),
						$mdIc = $mid.jqmData('mid-icon') || self.options.midBtnIcon,	
						$mdIp = $mid.jqmData('mid-iconpos') || self.options.midBtnIconPos,
						$mdTh = $mid.jqmData('mid-theme') || self.options.midBtnTheme,
						$mdTx = $mid.jqmData('mid-text') || self.options.midTxt,
						// as above - JQM does not work...
						/*$mnBt = $("<a href='#' data-inline='true' class='ui-crumbs popover-btn iconposSwitcher-a toggle_popover popToggle' title='back' data-panel='"+$mdId+"'>"+$mdTx+"</a>" ).buttonMarkup({										
									shadow: true,	
									corners: false,
									theme: $mdTh,
									iconpos: $mdIp,
									icon: $mdIc
									});
						*/
						$mdBt = $('<a data-iconpos="'+$mdIp+'" data-inline="true" data-icon="'+$mdIc+'" data-role="button" href="#" data-panel="'+$mdId+'" data-theme="'+$mdTh+'" class="ui-btn-up-'+$mdTh+' ui-btn ui-btn-icon-'+$mdIp+' ui-shadow popover-btn iconposSwitcher-a toggle_popover mmToggle midToggle"><span class="ui-btn-inner"><span class="ui-btn-text">'+$mdTx+'</span><span class="ui-icon ui-icon-'+$mdIc+' ui-icon-shadow"></span></span></a>');						
					}
					
				$buttons = $mnBt.add( $mdBt );

			// add switchable classes			
			if (buttonType == "switchable") {
				$menu.add( $mid ).addClass('switchable');						
				}
			
			// insert Buttons into dropZone
			self.setBtns( "add", $dropZone, $buttons );

			},

		setBtns: function ( action, $dropZone, $elements ) {
			
			// --- PURPOSE ---		
			// 1. 	inserts buttons into header or other element specified. Function checks what is there and create appropriate containers
			//      so buttons to be inserted are merged with whatever is there. Function also skins existing buttons (remove corners), and
			//      adds new corners/classes to the merged controlgroup. On small screens, button texts are dropped as there can be 3+ buttons
			//      on the left.
			
			// --- CALLED FROM ---
			// 1.   popoverBtn: insert popover menu toggles			
			// 2.   crumble: insert panel back buttons
						
			// --- UPDATES ---
			// JQM 1.1 RC2: merged the above three functions' rountine into this function
			//              
			
			// --- TODO ---
			// -  make sure this works with leftWrapper with select NOT controlgroup
			// -  clean code
			
			var self = this, 				
				$crns = 'ui-btn-corner-all ui-btn-corner-right',				
				$button, $first, $prevBtn, $newBtn, $lftWrp, $buttons, $ctrlGrp, $this, $clear, $filter;
							
			// only do something if not just updating corners
			if ( action != "update" ) {
				
				$dropZone.each(function() {
					
					$this = $(this),  
					$lftWrp = $('<div />').addClass("headWrapLeft ui-btn-left"),		
					$ctrlGrp = $('<div />').attr({'data-role':'controlgroup', 'data-type':'horizontal'}).addClass('btnSwitchBoard').controlgroup(), 					
					$buttons = $elements.clone();
					
					// (a) empty dropZone => create wrap and controlgroup, insert button(s)				
					if ( $this.find('.ui-btn-left').length == 0 && $this.find('.btnSwitchBoard').length == 0  ) {
						
						if ( $this.is( ".ui-header" ) ) {							
							// insert in header
							$this.prepend( $lftWrp.html( $ctrlGrp.html( $buttons ) ) );
							} else {
								// insert in content, user specified element - no need for header wrapper
								$this.prepend( $ctrlGrp.html( $buttons ) );
								}
														
					} else {
						
						// (b) there is something left - this should grab all headers					
						if ( $this.find('.ui-btn-left.ui-btn').length ) {
							
							// (b1) a button = edge case, since plugin always should add wrapper and controlgroup and place buttons inside
							$button = $this.find('.ui-btn-left.ui-btn');
							
							// "skin" button and replace with toggle controlgroup
							$button.removeClass( $crns+' ui-shadow popover-btn' )
									.find('.ui-btn-inner').removeClass( $crns ).end()
									.css({'position':'static'})
									.addClass('ui-controlgroup-btn-left ui-btn-inline iconposSwitcher-a')
							
							$this.find( $button ).remove();
							
							if ( $this.is( ".ui-header" ) ) {																
								$this.prepend( $lftWrp.html( $ctrlGrp.html( $button.add( $buttons ) ) ) );								
								} else {
									$this.prepend( $ctrlGrp.html( $button.add( $buttons ) ) );
									}
							
							} else {
								
								// (b2) something else, either a wrapper inside a header or a controlgroup inside a user specified element
								$first = $this.find('.ui-btn-left').children(':first');
								
								if ( $first.hasClass('ui-controlgroup') ) {
									
									// clean corners
									$first.addClass('btnSwitchBoard').find( '.ui-controlgroup-last').removeClass('ui-controlgroup-last ui-corner-all ui-corner-right')
											.find('.ui-btn-inner').removeClass('ui-corner-all ui-corner-right');																		
									
									function clearOut( $what ) {									
										$buttons.each(function () {
											if ($(this).is( $what )) {
												$buttons = $buttons.not( $what )													
												}
											});										
										}
																		
									// filter for existing buttons
									// TODO: improve
									if ( $first.find('.midToggle').length > 0 ) {										
										clearOut('.midToggle');
										}
									if ( $first.find('.menuToggle').length > 0 ) {										
										clearOut('.menuToggle');
										}
									if ( $first.find('.ui-crumbs').length > 0 ) {
										 clearOut('.ui-crumbs');
										}
									
									$first.append( $buttons ) 
									} else {
										
										// edge case: not a controlgroup, perhaps select element or ? 										
										$first.find( '.ui-btn' ).removeClass('ui-btn-corner-all')
													.find( '.ui-btn-inner').removeClass('ui-btn-corner-all');										
										$first.remove();																				
										$this.find('.headWrapLeft').prepend( $ctrlGrp.html( $first.add( $buttons ) ) );
										}
								}
					
						}
					});				
				}
			
								
			// add corners to first and last element
			$('.btnSwitchBoard').each( function () {				
				$(this).find('.ui-btn').first().addClass('ui-corner-left')
						.find('.ui-btn-inner').addClass('ui-corner-left');					
				$(this).find('.ui-btn').last().addClass('ui-corner-right ui-controlgroup-last')
						.find('.ui-btn-inner').addClass('ui-corner-right');	
				});
							
			},
		
/* -------------------------------------- SCREEN MODE HANDLER -------------------------------------- */
	
		popover: function () {
			
			// --- PURPOSE ---		
			// 1. set up popover mode
			
			// --- CALLED FROM ---
			// 1. splitScreen() - depending on screen size and orientation			
						
			// --- UPDATES ---
			// JQM 1.1 RC2: added third panel support, yield mode						
			
			// --- TODO ---
			// - consider moving screen-mode class assigning into Gulliver, but beware of race condition!
			// - data-yield-to="none" to allow users to specifiy, which panel to start from. Also need to add toggle buttons to all panels in this case!
			
			var self = this,				
				$wrap = $('div:jqmData(wrapper="true").ui-page-active'),
				$menu = $wrap.find('div:jqmData(panel="menu")'),
				$mid = $wrap.find('div:jqmData(panel="mid")'),
				$main = $wrap.find('div:jqmData(panel="main")'),
				$popover = $wrap.find('div:jqmData(panel="popover")'),
				$allPanels = $('div:jqmData(panel="popover"), div:jqmData(panel="menu"), div:jqmData(panel="mid")'),
				$popClasses = 'ui-popover pop_menuBox ui-panel-active ui-triangle-top',
				$yield = $('div:jqmData(yieldmode="true")');
				// removed ui-fixed-element-faux-top/bottom	
				
				$('html').addClass('ui-multiview-active ui-popover-mode').removeClass('ui-splitview-mode');			
				
			if( !$('html').hasClass('ui-fullscreen-mode') && $yield.length == 0 ) {
			
				$menu.addClass( $popClasses )					
						.removeClass('ui-panel-left pop_fullscreen')
						.attr({'data-fixed':'top'})
						.css({ 'width' :  $menu.jqmData("width") || self.options.menuWidth, 
							   'min-width' : $menu.jqmData("minWidth") || self.options.menuMinWidth })
						.append('<div class="popover_triangle" />')					
						.find('.ui-page .ui-content').addClass('overthrow');

				$mid.addClass( $popClasses )					
						.removeClass('ui-panel-mid pop_fullscreen')
						.attr({'data-fixed':'top'})
						.css({'width': $mid.jqmData("width") || self.options.midWidth, 
								'min-width': $mid.jqmData("minWidth") || self.options.midMinWidth })
						.append('<div class="popover_triangle" />')			
						.find('.ui-page .ui-content').addClass('overthrow');									
					
				$main.removeClass('ui-panel-right pop_fullscreen')
						.addClass('ui-panel-active')
						.find('div:jqmData(role="page")').andSelf()
						.css({'width':'', 'margin-left':'', 'min-width':''});							
			
				$popover.removeClass('pop_fullscreen')
						.addClass('ui-popover');
				
				} else {					
					// fullscreen mode - will also be assigned by Gulliver. Not sure this is needed!
					$allPanels.addClass('pop_fullscreen').removeClass('ui-popover');										
					}
					
			
			// popover button			
			self.popoverBtn("plain");	

			// adjust width		
			self.panelWidth();				
			},
				
		splitView: function () {			
			
			// --- PURPOSE ---		
			// 1. set up splitview - this mode is now handling 1,2,3 panels. If there is a single panel specified (should be main), 
			//    this will take up all available space (previously panel-type="fullwidth"). 
			// 2. Assign all necessary classes, and clear up any popver classes left
			// 3. Set width and margin of menu and mid panel			
			
			// --- CALLED FROM ---
			// 1. splitScreen() - depending on screen size and orientation			
						
			// --- UPDATES ---
			// JQM 1.1 RC2: added third panel support, 
			//              switched width/min-width into options settable through jqmData(width) and jqmData(minWidth)
			//              
			
			// --- TODO ---
			//
				
			var self = this,
				$wrap = $('div:jqmData(wrapper="true").ui-page-active'),
				$menu = $wrap.find('div:jqmData(panel="menu")'),
				$mid = $wrap.find('div:jqmData(panel="mid")'),
				$main = $wrap.find('div:jqmData(panel="main")'),				
				$popover = $wrap.find('div:jqmData(panel="popover")'), 
				$switch = self.options.switchable || $wrap.jqmData("switchable"),
				$switchOnLoad = self.options.switchableHideOnLoad || $wrap.jqmData("switchableHideOnLoad"),
				$popClasses = 'ui-popover pop_menuBox ui-triangle-top ui-panel-visible';
				// removed ui-fixed-element-faux-top/bottom
				
			$('html').addClass('ui-multiview-active ui-splitview-mode').removeClass('ui-popover-mode ui-fullscreen-mode');	
			
			$menu.removeClass( $popClasses )				
					// removed ui-fixed-element-faux-top
					.addClass('ui-panel-left ui-panel-active')
					.removeAttr('status')
					.removeAttr('data-fixed')
					.find('.ui-page .ui-content').removeClass('overthrow').end()
					.children('.popover_triangle').remove().end()
					.find('div:jqmData(show="first") .closePanel').remove().end()					
			
			$mid.removeClass( $popClasses )					
					.addClass('ui-panel-mid ui-panel-active')
					.removeAttr('status')
					.removeAttr('data-fixed')
					.find('.ui-page .ui-content').removeClass('overthrow').end()
					.children('.popover_triangle').remove().end()
					.find('div:jqmData(show="first") .closePanel').remove().end()									
			
			$main.addClass('ui-panel-right ui-panel-active');	
						
			$popover.removeClass('pop_fullscreen').addClass('ui-popover')
					.find('.ui-page .ui-content').addClass('overthrow');	
						
			if ( $switch && $switchOnLoad ){							
					
					// hide menu and mid - main will be fullwidth
					$menu.add( $mid ).css({'width':'', 'min-width':'', 'display':'none'}).attr('status','hidden');						
					} else {
					
						// regular, set width and min-width according to options or specified by user
						$menu.css({'width': $menu.jqmData("width") || self.options.menuWidth, 
								'min-width': $menu.jqmData("minWidth") || self.options.menuMinWidth, 
								'display':''})
							.attr('status','visible');
													
						$mid.css({'width': $mid.jqmData("width") || self.options.midWidth, 
								'min-width': $mid.jqmData("minWidth") || self.options.midMinWidth, 
								'display':''})
							.attr('status', 'visible');
					
					}					
								
			// insert toggle buttons		
			if ( $switch ){	
				
				self.popoverBtn("switchable");
				} else {					
					// remove any toggle buttons left if switching from popover to splitview					
					$(".mmToggle").remove();
					
					// update header button controlgroup
					self.setBtns("update")
					}
					
			// adjust width		
			self.panelWidth();			
			},						
								
		splitScreen: function( event ) {	
			
			// --- PURPOSE ---		
			// 1. Determine which screenmode to run - either splitview (panels side by side) or popover/yield. Depends on orientation AND screensize		
			
			// --- CALLED FROM ---
			// 1. setupMultiview() - for every wrapper page that is loaded initially or externally
			// 2. orientationchange 
			// (3. resize - would be possible, but this is really a strain on the browser and really of no use, so it's turned off)
						
			// --- UPDATES ---
			// JQM 1.1 RC2: 	
			//              
			
			// --- TODO ---
			// fiddle in yield-mode
			
			var self = this,
				$window=$(window);						
			
			if ( $('div:jqmData(wrapper="true")').find('div:jqmData(panel="menu"), div:jqmData(panel="main")').length == 0 ) {				
				return;
				}
				
			if(event) {				
				// portrait
				if (window.orientation == 0 || window.orientation == 180 ){
					if($window.width() > self.options.$upperThresh)  {						
						self.splitView();
						} else {						
							self.popover();
							}					 
					}
					// landscape
					else if (window.orientation == 90 || window.orientation == -90 ) {
					if($window.width() > self.options.$upperThresh) {							
						self.splitView();						
						} else {
							self.popover();
							}
						// click, resize, init events
						// TODO, block trash-events "from Triggers etc."
						} else if ($window.width() < self.options.$upperThresh){								
							self.popover();
							}
							else if ($window.width() > self.options.$upperThresh) {	
								self.splitView();
								}		
				}
					
			}, 			
	
/* -------------------------------------- PANEL/PAGE/CONTENT FORMATTING -------------------------------------- */
			
		gulliver: function() {
		
			// --- PURPOSE ---		
			// 1. set classes for fullscreen mode, remove button-text on denoted buttons, activate backPageHeight, so when a panel is opened
			//    in fullscreen mode, the height of the page in the back gets modified to match the page height of the front page.
			
			// --- CALLED FROM ---
			// 1. Orientationchange
			// 2. SetupMultiview - once per wrapper page
						
			// --- UPDATES ---
			// JQM 1.1 RC2: 	
			//              
			
			// --- TODO ---
			// clean up iconposSwitcher
			// add yield mode
		
			var self = this,
				$allPanels = $('div:jqmData(panel="popover"), div:jqmData(panel="menu"), div:jqmData(panel="mid")'),
				$popPanels = $('div:jqmData(panel="popover")');

			var	maxHeight = 0;
			
			// determine whether popover height > available screen height 
			$popPanels.each(function(){					
					var checkHeight = $(this).css('height'),
						parsedHeight = parseFloat(checkHeight);
						
					if ( parsedHeight > maxHeight) {						
						maxHeight = parsedHeight;						
						}
					});
					
			// switch to fullscreen mode, if width < 320px OR popovers are bigger than screen height
			if ( self.framer() == "small" || maxHeight > $(window).height() ) {																
				
				// make sure we popover mode is fired, so the screen is not split if the window
				// is for example 500px x 100px. Only if there are menu/main panels of course
				if ( $('div:jqmData(wrapper="true").ui-page-active').find('div:jqmData(panel="menu"), div:jqmData(panel="main")').length > 0 ) {
					// deactivate, because otherweise event fires twice multiplying buttons
					// self.popover();
					}
				
				// tweak for fullscreen mode
				$allPanels.removeClass('ui-triangle-top ui-triangel-bottom ui-popover ui-popover-embedded')
						.addClass('pop_fullscreen')
						.find('.popover_triangle')
							.remove();				
				
				// .iconposSwitcher - clean up!
				$(".iconposSwitcher-div .ui-btn").not('.noSwitch').attr('data-iconpos','notext').removeClass('ui-btn-icon-left ui-btn-icon-right').addClass('ui-btn-icon-notext');
				$(".iconposSwitcher-div label, .iconposSwitcher-select label, .hideLabel").addClass("ui-hidden-accessible");								
				
				$(".iconposSwitcher-input").closest('.ui-btn').attr('data-iconpos','notext').removeClass('ui-btn-icon-left ui-btn-icon-right').addClass('ui-btn-icon-notext');				
				$(".iconposSwitcher-select").find('.ui-icon').css({'display':'none'})
				
				$(".noIconposSwitcher-div .ui-btn").attr('data-iconpos','none').removeClass('ui-btn-icon-left ui-btn-icon-right').addClass('ui-btn-icon-none');
				$(".iconposSwitcher-a").attr('data-iconpos','notext').removeClass('ui-btn-icon-left ui-btn-icon-right').addClass('ui-btn-icon-notext');									
								
				// set a listener to adapt height of all active pages to the height of the page currently in view. 
				// if you have a long page in the background and fire a popover in fullscreen mode, the page length 
				// should match the popovers active page length, otherwise the background page is visible underneath
				$(document).on('pagebeforeshow', $popPanels.find('div:jqmData(role="page")'), function () {													
					self.backgroundPageHeight( $(this), "set" );
					});
				
				$('html').addClass('ui-fullscreen-mode').removeClass('ui-splitview-mode ui-popover-mode');		
										
				} else {			
					
					// TODO: beware of splitview or popover mode...
					// TODO: not much happening here... 
					$('html').removeClass('ui-fullscreen-mode');
									
					}								

			$allPanels.each(function(index) {	
				
				// only fire if no back button exists, as this fires on resize, too...
				if ( $(this).find('.back_popover').length == 0 ) {
				
					// all panels' first pages' close-button
					var $closeFirstPage = ( $(this).hasClass('pop_fullscreen') ) ? 'back' : 'close',
						$closeIcon = ( $(this).hasClass('pop_fullscreen') ) ? 'data-icon="back"' : 'data-icon="close"'
						$backButton = '<a href="#" data-role="button" '+$closeIcon+' data-inline="true" data-iconpos="left" data-theme="a" class="back_popover ui-btn-left closePanel">'+$closeFirstPage+'</a>';
						$firstPage = $(this).find('div:jqmData(show="first")').not('.ui-splitview-mode div:jqmData(panel="menu") div:jqmData(role="page"), .ui-splitview-mode div:jqmData(panel="mid") div:jqmData(role="page")');
						
					//TODO: do I need to page() again?
					$firstPage.page();
					$firstPage.find('div:jqmData(role="header") h1').before($backButton);					
					$(this).find('div:jqmData(show="first")').page();
					$firstPage.find('.back_popover').buttonMarkup();											
					}
				});		
			
			}, 
							
		panelWidth: function( fromWhere ) {					
			
			// --- PURPOSE ---		
			// 1. set and adjust panel width and margin-left ~ similar to JQM updateLayout
			// 2. set and adjust nested page/header/footer width and margin-left, because (long story...) width/margin need to be set 
			//    on nested main pages, because otherwise they expand to 100%, because main is pos:rel, because if pos:static is used  
			//    transitions are visible all the way = see page being pulled up etc...)     			
			// 3. manage differences between width 25% and min-width: 250px (because if 25% < 250px panels will overlap)
			
			// --- CALLED FROM ---
			// 1. pagebeforeshow
			// 2. orientationchange
			// 3. plugin setup (initial setting)
			// 4. splitview setup
			// 5. showing popovers???
			
			// --- UPDATES ---
			// JQM 1.1 RC2: as fixed toolbars now switch between pos:fix and pos:abs, local headers and footers need specific width, because
			//              previous width: 100%/auto will cover full screen in pos:fix mode			
			
			// --- TODO ---
			// - check if JQM 1.1 scrollTop&fade allows main panel to be pos:static, thereby avoiding having to set width/margin-left on all main pages
			//   I needed to set pos:static anyway, check to see if transitions still work... 
			// - check if call on showing popovers is necessary			
							
			var self = this,
				$main = $('div:jqmData(panel="main")'), 
				$mainPages = $main.find("div:jqmData(role='page')"), 
				$mainElems = $mainPages.find('.ui-header, .ui-footer'),
			
				$mid = $('div:jqmData(panel="mid")'), 
				$midPages = $mid.find("div:jqmData(role='page')"), 
				$midElems = $midPages.find('.ui-header, .ui-footer'),
			
				$menu = $('div:jqmData(panel="menu"):not("ui-popover")'), 
				$menuPages = $menu.find("div:jqmData(role='page')"), 
				$menuElems = $menuPages.find('.ui-header, .ui-footer'),
				
				$wrapWidth, 
				// modifiy this depending on yield-mode and priority
				$mainWidth,
				$menuWidth = 0, 
				$midWidth = 0;
			
			// This timeout is for Firefox, because we need to make sure panelHeight has run
			// before panelWidth fires. panelHeight makes sure global-header/footer + active 
			// panels > screenHeight = hiding scrollbars. In Firefox, panelWidth
			// calculates element width BEFORE panelHeight hides scrollbars, so without the timeout
			// the width is off by 17px (space the scrollbar needs), because panelWidth runs while
			//  the scrollbars are still visible.
			window.setTimeout( function() {	
			
				$wrapWidth = $('div:jqmData(wrapper="true").ui-page-active').innerWidth();
										
				if (self.framer() != 'small' && $('html').hasClass('ui-splitview-mode') ) {
								
					// width = 0, if there is no menu/mid panel or they are hidden (switchable mode)
					$menuWidth = !$menu || !$menu.is(":visible") ? 0 : parseFloat($menu.outerWidth() );
					$midWidth = !$mid || !$mid.is(":visible") ? 0 : parseFloat($mid.outerWidth() );	
					
					// set
					$menuPages.add( $menuElems ).css({ 'width' : $menuWidth });					
					$midPages.add( $midElems ).css({ 'margin-left' : $menuWidth, 'width' : $midWidth });
					
					} else if ( $('html').hasClass('ui-popover-mode') || $('html').hasClass('ui-fullscreen-mode')  ) {
						
						$menuPages.add( $midPages ).css({'width':''});										
						}
														
				// should be the same across all view modes - set main panel/pages/toolbars				
				$main.css({'margin-left': $menuWidth+$midWidth, 'width':$wrapWidth-$menuWidth-$midWidth });
				$mainPages.css({'margin-left':$menuWidth+$midWidth, 'width':$wrapWidth-$menuWidth-$midWidth });
				$mainElems.css({'width':$wrapWidth-$menuWidth-$midWidth, 'left':'auto'});	
				
				},10);
			}, 

		panelHeight: function () {
			
			// --- PURPOSE ---		
			// 1. set panel-viewport height thereby also setting wrapper-page height to enable fixed-toolbars
			//    In regular JQM, the page-height is determined by the page-content. In multiview, the height of of nested pages is not "inherited up"
			//    to the wrapper page, because of the panel in between, which sets the wrapper-page height, thereby breaking the 
			//    fixed footer, which on hide jumps up the screen. 
			//    This function fixes this by setting panel height and corresponding wrapper-page height to 
			//	  a) the heighest active nested page height in regular mode
			//    b) screenheight less global toolbars in overthrow mode
			//    
			// 2. adjust nested page content padding for global header and footer			
			
			// --- CALLED FROM ---
			// 1. plugin setup (initial)
			// 2. orientationchange
			// 3. updatelayout???
			// 4. backgroundPageHeight after altering height of background-page
			
			// --- UPDATES ---
			// JQM 1.1 RC2 		rewrite, set "Regular" and "Overthrow" modes
			// 
			
			// --- TODO ---
			// - adjust padding in case there is a global AND local toolbar - padding should be double!			
			// - check to see whether this can be CALLED FROM updateLayout, e.g. when opening collapsibles - need to adjust!	
			// - simplify 
			// - check if use of margin is iOS-proof
				
			var self = this,				
				$activeWrapper = $('div:jqmData(wrapper="true").ui-page-active'),
				$panels = $activeWrapper.find('.ui-panel:not(.ui-popover)'),
				$contents = $activeWrapper.find('.ui-panel:not(.ui-popover) .ui-page .ui-content'),								
				
				$overthrow = $activeWrapper.jqmData("scrollmode") == "overthrow",								
				$cond = $overthrow && ( !$('html').hasClass('ui-popover-mode') && !$('html').hasClass('ui-fullscreen-mode') ),
				$marPad = $cond ? ["margin-top", "margin-bottom"] : ["padding-top", "padding-bottom"],
				
				$glbH = $activeWrapper.find('.ui-header-global:eq(0)'),
				$glbF = $activeWrapper.find('.ui-footer-global:last'),
				
				$setHeight = 0,
				$locH, $locF, $dims, $localHeight;
			
			// set content padding/margin for nestes pages - JQM updatePagePadding is only for wrapper page!
			// This is tricky, because in overthrow-mode, margin needs to be set instead of padding to not hide 
			// the content behind the toolbars. Not sure if this works on iOS
			$contents.each(function() {
				
				$locH = $(this).siblings('.ui-header:eq(0)');
				$locF = $(this).siblings('.ui-footer:eq(0)');				

				$dims = {};
				$dims[$marPad[0]] = $glbH.length > 0 ? $glbH.outerHeight() + $locH.outerHeight() : $locH.outerHeight(); 
				$dims[$marPad[1]] = $glbF.length > 0 ? $glbF.outerHeight() + $locF.outerHeight() : $locF.outerHeight();
				
				if ( $cond ) {
					$dims["padding-top"] = "0px";
					$dims["padding-bottom"] = "0px";
					}
				
				$(this).css($dims)					
						
				})
			
			// set panel/page/wrapper page height 			
			if ( $cond ) {								
				// this is for splitview-mode = fix screen to allow overthrow-based scrolling of multiple background panels
				
				$setHeight = $.mobile.getScreenHeight() - $glbH.outerHeight() - $glbF.outerHeight(); 
												
				// set panel and wrapper
				$panels.add( $panels.find('.ui-page') ).css({'height': $setHeight });					
				$activeWrapper.css({'overflow':'hidden' });

				// set content height
				$contents.each(function() {
					$localHeight = $(this).siblings('.ui-header:eq(0)').outerHeight() + $(this).siblings('.ui-footer:eq(0)').outerHeight();
					$(this).css({ 'height':$setHeight-$localHeight }).addClass("overthrow");						
					});
					
		
				} else {
					// this is for popover-mode and fullscreen-mode, which should not use overthrow, because there is only one panel visible 
					// in the back at all times = use normal scrolling
			
					//get heighest height of active nested page													
					$panels.find('.ui-page-active').each(function() {						
						if ( $(this).outerHeight() > $setHeight ) {				
							$setHeight = $(this).outerHeight();							
							}					
						});
					
					// set panel-height and wrapper-page height
					$('div:jqmData(panel="main"), div:jqmData(panel="mid"), div:jqmData(panel="menu")').css({'height': $setHeight});						
					}
																							
				// overwrite menu height again, otherwise popover panels expand depending on content 			
				if ( $('html').hasClass('ui-popover-mode') ) { 					
					$('div:jqmData(panel="menu")').add('div:jqmData(panel="mid")').css({'height':''});
					}
			
			},
		
					
		backgroundPageHeight: function (page, mode) {
			
			// --- PURPOSE ---		
			// 1. In fullscreen mode (smartphones), the plugin opens popovers as fullscreen "pages". When you open a popover there 
			//    is an active background page (e.g. length 2000px) and the active page inside the popover (e.g. length 400px).  
			//    This function takes the height of the popover page (400px) and sets it to all active background pages (change 2000px to 400px)
			//    while the panel and page are visible. This way fullscreen-mode can use hardware scrolling and there is no 
			// 	  need to use overthrow. The function is set when the popover panel shows and cleared when it hides.
						
			// --- CALLED FROM ---
			// 1. pagebeforeshow on popover panel pages = when loading a new page into a panel
			// 2. showpanel in fullscreen mode to set 
			// 3. hidepanel in fullscreen mode to clear
			
			// --- UPDATES ---
			// 	JQM 1.1 RC2 		call panelHeight to adjust fixed toolbars after alterning page height		
			
			// --- TODO ---
			// loose the 1px					
			
			var self = this,
				allActive = $('.ui-page').not( page ), 
				maxHeight;						
			
			// only tweak page height if a popover panel is opened - this can also be the MENU oder MID in popover mode!!!
			if ( $('div:jqmData(panel="popover") .ui-page-active, div:jqmData(panel="menu").pop_fullscreen .ui-page-active, div:jqmData(panel="mid").pop_fullscreen .ui-page-active').length > 0 && mode == "set" ) {				
			
					maxHeight = page.outerHeight();										
					allActive.addClass("shrunk")
								.css({	'height': maxHeight-1, 'overflow': 'hidden' })								
				}	
			
			// always try to clear
			if ( mode == "clear")  {						
				$('.shrunk').each( function() {
					allActive.css({'height': '', 'overflow': 'visible' }) })
								.removeClass('shrunk');						
					}
						
			// always run panelHeight to adjust fixed toolbar positioning!
			self.panelHeight();
					
			},
			
		framer: function () {
			
			// --- PURPOSE ---		
			// 1. This function sets internal screen modes "small" <320px, "medium" >320 & <768px and "large" >768px
						
			// --- CALLED FROM ---
			// 1. Gulliver() - which sets small screen CSS = hides button texts, sets popovers to fullscreen etc.
			// 2. panelWidth() to make sure we are not in small mode
			 
			
			// --- UPDATES ---
			// 	JQM 1.1 RC2 		optionize threshold widths	
			
			// --- TODO ---
			// "supersize"? for TV? 
				
			var self = this;
				
				// layout mode - need to use $(window), because $this fails in IE7+8...										
				if ($.mobile.media("screen and (max-width:320px)")||($.mobile.browser.ie && $(window).width() < self.options.$lowerThresh )) {
					var framed = "small";
					} else if ($.mobile.media("screen and (min-width:768px)")||($.mobile.browser.ie && $(window).width() >= self.options.$upperThresh )) {
						var framed = "large";
						} else {
							var framed = "medium";
							}
							
			return framed;	
			
			},			
		
/* -------------------------------------- HELPERS (some from JQM ) -------------------------------------- */				

		findClosestLink: function ( ele ) {
		
			// --- PURPOSE ---		
			// 1. same as JQM
						
			// --- CALLED FROM ---
			// 1. clickRouting()
			 
			
			// --- UPDATES ---
			// 	JQM 1.1 RC2  added middle panel
			
			// --- TODO ---
			//
			
			while ( ele ) {
				// Look for the closest element with a nodeName of "a".
				// Note that we are checking if we have a valid nodeName
				// before attempting to access it. This is because the
				// node we get called with could have originated from within
				// an embedded SVG document where some symbol instance elements
				// don't have nodeName defined on them, or strings are of type
				// SVGAnimatedString.
				if ( ( typeof ele.nodeName === "string" ) && ele.nodeName.toLowerCase() == "a" ) {
					break;
				}					
				ele = ele.parentNode;					
				}
			return ele;
			
			},
						
		clearActiveClasses: function ( trigger, useBruteForce, toPage, fromPage, link ) {										
			
			// --- PURPOSE ---		
			// 1. clear button classes on panels after and buttons after transitions
						
			// --- CALLED FROM ---
			// 1. panelTrans() = panel transition
			// 2. panelHash() = panel backwards transition
			 
			
			// --- UPDATES ---
			// 	JQM 1.1 RC2  added middle panel
			
			// --- TODO ---
			//
			
			var self = this;
			
			// clear active buttons :-)
			if (link) {
				link.closest('.ui-btn').addClass('ui-clicked-me');
				link.closest('div:jqmData(role="page")').find('.ui-btn-active').not('.ui-clicked-me').removeClass('ui-btn-active');
				link.closest('.ui-btn').removeClass('ui-clicked-me');
				}

			// clear active links if to and from page are on the same panel
			if (toPage.closest('div:jqmData(role="panel")').jqmData("id") == fromPage.closest('div:jqmData(role="panel")').jqmData("id")  ) {																		
					// show active color for at least 1sec
					window.setTimeout( function() {
						fromPage.find('.ui-btn').removeClass( $.mobile.activeBtnClass );
					},1000 );
				} 
							
			// also clear active links if reverse transition on menu/main				
			if (trigger == "panelHash" && ( toPage.closest('div:jqmData(panel="main")') || toPage.closest('div:jqmData(panel="menu")') || toPage.closest('div:jqmData(panel="mid")')  ) ) {
					window.setTimeout(function() {						
					$('div:jqmData(panel="main"), div:jqmData(panel="menu"), div:jqmData(panel="mid")').find(".ui-page-active .ui-btn").removeClass( $.mobile.activeBtnClass );
					},500 );
				}			
			},
					
		clickRouter: function( e, data, source) {																
			
			// --- PURPOSE ---		
			// 1. in order to run both click based AND programmatic panel transitions through the same panelTrans() function, this function captures the click
			//    event on all clicks and stores it at option $stageEvent. The function captures and blocks multiple clicks and is triggered on vclick, so it
			//    always comes in before the click event and any other event firing. Guess the 300ms make this work :-)
									
			// --- CALLED FROM ---
			// 1. on click
			// 2. on vlick - whichever is faster
			 
			
			// --- UPDATES ---
			// 	JQM 1.1 RC2  added middle panel
			
			// --- TODO ---
			//
			
			var self = this, link, $link;
					
			// make sure only one event passes
			if ( $('html').data('clickInProgress') == false ) {								
				$('html').data({'clickInProgress':true })

				// this returns crap, if I programmatically trigger a click on another link element
				// instead of the actual clicked element, the previously clicked element is returned.				
				// $( e.target ).closest('a')				
				
				// alternative:				
				link = $( self.findClosestLink(e.target) );				
					
				if ( !link || e.which > 1) {
					return;
					}
				
				$link = $( link );
							
				if ( link.length === 1 && $(link).jqmData("panel") ) {											
					// store the click event/link element 						
					self.options.$stageEvent = $link;					
					}
					
				if ( link.length === 1 && link.jqmData('context') ) {
					// fire a second changePage
					self.context( link );					
					}	
				
				}		
			},
					
		
/* -------------------------------------- PANEL HISTORY HANDLER -------------------------------------- */			
		browserReset: function () {
				
			var self = this, distance;
			
			// since transitions inside panels also register entries in the window history, 
			// this unwinds the window history by entries made from panel transitions			
			distance = self.options.$windowHistoryManualCounter;
			// need to if this, otherwise iPad keeps reloading the page... 
			if ( distance > 0 ) window.history.go(-self.options.$windowHistoryManualCounter);			
			},
	
		historyDump: function( panel ) {
			
			var self = this,
				$panels = panel;			
							
			// run through everything that's passed
			$panels.each(function(){
				// clear history of active (= visible) popovers. Menu only included in popover-mode!				
				if ( typeof $(this).data("stack") != 'undefined') {
					var i = $(this).data("stack").length;												
					while (i > 1) {
						 i = i-1;
						 $(this).data("stack").pop();
						}
					}
				});			
					
			// clean up url and remove last visited page on panel from URL
			// ipad errors "type of expression" undefined if I have not done a transition, so
			// I'm also checking for base						
			// var rem = $('div:jqmData(wrapper="true").ui-page-active').data("rememberState");
			
			// if (rem && typeof rem != 'undefined' && $('html').data('backAtBase') != true ) {	
				// history.replaceState('null',rem.title,rem.url  );																
				// }		
				

			},
		
		// panel navigation and panel hash routines
		// adding entries to panel history stacks
		stackUp: function (source, event, data) {
		//	console.log("=====  panel UP, source= "+source+" =====");
													
				var self = this;														
				
				var $targetPanel = $( event.target ),
					$targetPanelType = $targetPanel.jqmData('panel'),					
					// if a new page was added into the DOM or into a panel data.toPage.attr 
					// will be undefined. The selector is the id of the pulled in page, 
					// (like #ext1.html) so setting targetPage to this id integrates 
					// it into the panel history navigation.
					obj = $.mobile.path.parseUrl( data.toPage );
				
					// TODO: this stinks, makes ext1.html into #ext1, which will cause all kind of problems when retrieving and loading a page from it :-)
					$targetPage = obj.hash != "" ? obj.hash : typeof data.toPage.attr('id') != undefined ? '#'+data.toPage.attr('id') : obj.filename.replace(".html","")
					
				// if target panel has data-hash="history", add entry to panel stack			
				if ( $targetPanel.jqmData('hash') == 'history' ) {
					// if main or menu is the target both need to be increased. 
					// the targeted panel gets the targetPage as entry, the other one gets a "yield" entry
					
					// as both menu and main can be active in splitview mode, the highest hist.length does not
					// necessarily imply the back transition is on that panel. Therefore main and menu are 
					// increased evenly, and on back transitions, the last entry not being "yield" is used.													
					if ( $targetPanelType == 'menu' ) {		
						// console.log("menu transition");
						$('div:jqmData(panel="main")').data("stack").push("yield");
						
						$('div:jqmData(panel="menu")').data("stack").push($targetPage);						
						} else if ($targetPanelType == 'main') {																								
							// console.log("main transition");
							$('div:jqmData(panel="menu")').data("stack").push("yield");
							
							$('div:jqmData(panel="main")').data("stack").push($targetPage);
							} else {
								// console.log("popover transition");
								$targetPanel.data("stack").push($targetPage);	
								}
					
						// increase manual counter, if new page is not in the panel history stack already
						// I guess, because window.history will not include double entries
						if ( $.inArray($targetPage, $targetPanel.data("stack") ) != -1 ) {													
							++self.options.$windowHistoryManualCounter
							}						
						
						// as a panel transition with active panel history was made,
						// back@base needs to be set to false. By only declarding inside
						// stackUp and stackDown, this will only be set once transitions
						// are made and not from init.
						// this is needed to allow JQM handleHashChange to take back over
						// once all panels are reset to base level
						$('html').data({'backAtBase':false});	

						// now that a panel transition was made, we need a lastStand blocker to ensure
						// jqm does not take over together with the last panel transition (when all stacks
						// are back at their original level, but only AFTER the last panel transition 
						// (when the lastStand has fallen...)
						// TODO: this was previously reset with every new wrapper-page being loaded into 
						// the DOM, not sure why, because it has to be a global tracker, since all 
						// panels need to be reset when a page is left
						$('html').data("lastStand", "standing");
																							
						// keep JQM history at initial level, keep it at inital level						
						self.unwindHistory();
						}
						
					
					//console.log("JQM history length="+$.mobile.urlHistory.stack.length);	
					
					//$.each($.mobile.urlHistory.stack, function(i, element) {
					//	console.log("history entry "+i+':' + element.url);					
					//	});						
					 
					// console.log( "at init"+self.options.$jqmHistoryStackAtInit );
				
					// console.log("stackUp pop1 "+$('div:jqmData(id="log")').data('stack') );
					// console.log("stackUp pop2 "+$('div:jqmData(id="setup")').data('stack') );
			//		console.log("stackUp menu "+$('div:jqmData(panel="menu")').data('stack') );
				//	console.log("stackUp main "+$('div:jqmData(panel="main")').data('stack') );	
					//  console.log("ignoreNext= "+self.options.$ignoreMyOwnNextHashChange);
					//  console.log("crumbsBlockStackUp= "+self.options.$crumbsBlockStackUp);
					// console.log("backAtBase= "+$('html').data("backAtBase"));
					// console.log("lastStand= "+$('html').data("lastStand"));
					//  console.log("hashJoker= "+self.options.$hashJoker);
					//  console.log("contextBlockNextHashChange= "+self.options.$contextBlockNextHashChange);
					
			}, 
			
		// reduce panel history stacks
		stackDown: function ( source, event, data ) {
			// console.log("=====  panel DOWN, source= "+source+" =====DICKHEAD" );						 
			
			var self = this,
				getHash = $.mobile.path.parseUrl( data.toPage );
			
			if (getHash.hash) {
				var goTo = getHash.hash;
				} else {
					var goTo = '#'+getHash.href;
					}			
			
			var	$closestPanel = $( goTo ).closest('div:jqmData(role="panel")'),							
				$closestPanelID = $closestPanel.jqmData('panel'),
				$panels = $('div:jqmData(hash="history")'),
				longest = [],
				longestLen = 0;
				
			// console.log( "here isset="+$closestPanelID );
			
			if ( $closestPanelID == "menu" || $closestPanelID == "main") {
					// console.log("MAIN/MENU hashchange");
					$('div:jqmData(panel="main")').data('stack').pop();
					$('div:jqmData(panel="menu")').data('stack').pop();					
					} else {				
						// console.log("POPOVER hashchange");
						$closestPanel.data('stack').pop();					
						}
					
					// unwind 
					self.unwindHistory();					
					
					//earned a joker = one time pass through ignoreMyOwnNextHashChange				
					// self.options.$hashJoker = 1;
					
					// rountine for setting a flag for JQM to take back over
					// TODO: used elsewhere, too, bundle
					$panels.each(function(){					
						var data = $(this).data("stack");										
						if(data.length > longestLen){					
								longest = [data];
								longestLen = data.length;							
								}
								else if(data.length == longestLen) {
									longest.push(data);																					
									}
							});	
							
					if ( longest.length/$panels.length == 1 ) {
						// back@base will only be set to TRUE from stackDown, this way
						// ensuring the inital base is not falsely interpreted as back@base.
						// This is needed to allow JQM handleHashChange to take over
						// once all panels are reset to base level and to block it from
						// doing anything while transitions are made on any panel	
						$('html').data({'backAtBase':true});												
						}	
														
				//console.log("JQM history length="+$.mobile.urlHistory.stack.length);	
					
					//  $.each($.mobile.urlHistory.stack, function(i, element) {
					//	console.log("history entry "+i+':' + element.url);					
				//});											
				//	console.log( "at init"+self.options.$jqmHistoryStackAtInit );  								
				// console.log("stackDown pop1 "+$('div:jqmData(id="log")').data('stack') );
				// console.log("stackDown pop2 "+$('div:jqmData(id="setup")').data('stack') );
				// console.log("stackDown menu "+$('div:jqmData(panel="menu")').data('stack') );
				// console.log("stackDown main "+$('div:jqmData(panel="main")').data('stack') );
				//	  console.log("ignoreNext= "+self.options.$ignoreMyOwnNextHashChange);
				//	  console.log("crumbsBlockStackUp= "+self.options.$crumbsBlockStackUp);
				// console.log("backAtBase= "+$('html').data("backAtBase"));
				// console.log("lastStand= "+$('html').data("lastStand"));
				//	  console.log("hashJoker= "+self.options.$hashJoker);
				//	  console.log("contextBlockNextHashChange= "+self.options.$contextBlockNextHashChange);		
			
		},
		
		unwindHistory: function() {
			
			// make sure $.mobile.urlHistory stays at initial level
			var self = this,
				i  = $.mobile.urlHistory.stack.length;	
						
			while (i > self.options.$jqmHistoryStackAtInit) {
				i = i-1;
				$.mobile.urlHistory.stack.pop();	
				}		
			
		},
		
		// determines which panels to add entries to
		_mmHandler: function (howMany, longest, longestLen) {
					
			// (b-1), single highest panel can now only be a main panel
			if (howMany == 1) {
				var gotoPage = longest[0][longestLen-2].toString();
				
				return gotoPage; 
			}
			// (b-2) two highest panels, can only be menu/main
			if (howMany >= 2) {
				// console.log("two");
				var $last0 = longest[0][longestLen-1].toString(),
					$last1 = longest[1][longestLen-1].toString();								

				// main/menu (increase simultaneously - passive entry = "yield")
				// backwards transition should be made to last entry not being yield
				// starting from stackHeight-1 (otherwise result will be currently 
				// active page
				if ( $last0 == "yield" )  { 
					for (i = longestLen-2; i>=0; i--) {				
						if ( longest[1][i].toString() != "yield") {									
							var gotoPage = longest[1][i].toString();												
							break;
							}
						}
					} else if ($last1 == "yield" ) {
						for (i = longestLen-2; i>=0; i--) {
							if ( longest[0][i].toString() != "yield") {										
								var gotoPage = longest[0][i].toString();												
								break;
								}
							}				
						} 
											
				return gotoPage;			
			}
			
			
			// (b-3) working selector for more 3 panels with highest stack
			if (howMany == 3) {
				var $last = [];
				for ( var i = 0; i < longest.length; i++) {							
					$last.push( longest[i][ longest[i].length - 1 ] );						  						  
					if ( $( $last[i] ).closest(':jqmData(role="panel")').jqmData('panel')  == "popover" ) { 
						var gotoPage = $last[i];
						}						  
					}
					
				return gotoPage;
				
				}
			
			},
			
/* -------------------------------------- PANEL NAVIGATION -------------------------------------- */			


		context: function( object ) {	
				
				var self = this,
				// data-context handler - a page with a link that has a data-context attribute will load that page after this page loads				
				// original only allowed for menu<>main panel context loading. By adding data-context-panel attribute this is now more flexible
				// TODO: does this need a refresh option?
					$context = object,
					$targetPanelID = $context.jqmData('context-panel');
				
				// in fullscreen mode, no context loading is possible
				// because which page to show?
				if ( !$('html').hasClass('ui-fullscreen-mode') ) {
					
					// make sure the pageContainer is correctly set for the 2nd transition
					$.mobile.pageContainer = $('div:jqmData(panel="'+$targetPanelID+'")');

					// context changePage
					$.mobile.changePage( $( $context.jqmData('context') ), { transition:'slide', changeHash:true, fromHashChange: false, pageContainer: $.mobile.pageContainer });															
					
					// block next hashChange transition					
					self.options.$contextBlockNextHashChange = true;
							
					// TODO: I hoped this would fire with the regular pageChange-binding in mainEvents
					// but it does not. Need to fake event and data...
					// create fake objects
					var fakeEvent = {},
						fakeData = {};					
					
					// assign fake attributes needed to add panel history entries
					fakeEvent.target = $( 'div:jqmData(id="'+$context.jqmData("context-panel")+'")' );				
					fakeData.toPage = $( $context.jqmData('context') );		
					
					// add panel history entry for context transition
					self.stackUp("context", fakeEvent, fakeData);
								
					}
				
			},
	
		// panel transition handler - data is post-modified
		panelTrans: function (e, data) {							
					
			var	self = this,
				$link = self.options.$stageEvent,		
				
				// target - ok
				$targetPanelID = $( $link ).jqmData('panel'),					
				$targetPanel = $link ? $('div:jqmData(id="'+$targetPanelID+'")') : data.options.pageContainer,
				$targetPanelActivePage = $targetPanel.find( '.ui-page-active' ) || $targetPanel.find('div:jqmData(show="first")'),
				// current 
				$currPanel = $link ? $link.closest('div:jqmData(role="panel")') : data.options.fromPage.parents('div:jqmData(role="panel")'),
				$currPanelID = $currPanel.jqmData('id'),
				// activePage will be fromPage
				$currPanelActivePage = $currPanel.find( '.ui-page-active' ) || $currPanel.find('div:jqmData(show="first")');
									
				// make sure fromPage.data("page") does not return undefind
				$currPanelActivePage.page();
				
				// change options
				// data.options.fromPage = $('div:jqmData(wrapper="true")');
				data.options.fromPage = $currPanelActivePage;	

				data.options.pageContainer = $targetPanel;
				data.options.changeHash = $targetPanel.jqmData('hash') == 'history' ? true : false;										
								
				// set scrollTop blocker to keep popover panels visible when loading a new page into the DOM									
				if ( ( $targetPanel.jqmData("panel") || $currPanel.jqmData("panel") ) == "popover" ) {					
					self.options.$panelTransBlockScrollTop = true;
					}
					
				// clear stageEvent for next transition
				self.options.$stageEvent = '';
				
				// unblock for the next click event
				$('html').data({'clickInProgress':false })
				
				// set a flag for pushState passing along the url to load. 
				// if pushState is supported and a new page is loaded (isPath),
				// JQM will grab the URL (which should be xyz.html and append
				// it to the wrapper page vs. replacing the wrapper page and 
				// breaking back button/history along the way. This flag will
				// be reset with every panelTransition and reset inside the
				// pushStateHandler
				// used to be "url", now toPage
				$('html').data('pushStateFlag', data.toPage );
							
				// TODO: same as context, handler, create fakeEvent and fakeData
				var fakeEvent = {},
					fakeData = data;

				// assign fake attributes needed to add panel history entries
				fakeEvent.target = $targetPanel;																	
				
				// console.log( "vor stackup")
				// console.log( data )
				
				// block stack adding if it was a crumbs based (reverse) transition				
				// if ( self.options.$crumbsBlockStackUp == false) {				
					self.stackUp("panelTrans", fakeEvent, fakeData);						
					// }						
				
				// if set to true in order to block a crumbs backward transition
				// firing a stackUp event, reset to false, so next regular 
				// transition works again
				/*
				if ( self.options.$crumbsBlockStackUp == true ) {										
					self.options.$crumbsBlockStackUp = false
					}
				*/
				// call active class clearing				
				self.clearActiveClasses( "panelTrans", true, $(data.toPage), data.options.fromPage, $link );
								
				// set the Joker, to detect whether a panel transition fired
				// or not. In panelHash I can check for the joker.
				// if it's not set, panelTrans did not fire before,
				// so it would be a hashchange only transition and
				// then I can set $ignoreMyOwnNextHashChange accordingly
				// to allow subsequent hashChange (back button) transitions
				// to pass. 					
				// self.options.$hashJoker = 0;				
				
				// keep it false! 												
				// self.options.$ignoreMyOwnNextHashChange = false;									
				
				//make sure wrapper page stays activePage		
				$.mobile.activePage = $('div:jqmData(wrapper="true")');
								
				// reset page container to prevent regular JQM loading pages into a container
				// pageContainer will be re-set on next panel-transition to correct panel,
				// but if a regular JQM transition fires pageContainer would be stuck at the 
				// panel the last page was loaded into. Therefore reset (like for the loader:
				$.mobile.pageContainer == $('body') ? $.mobile.pageContainer : $('body'); 
													
				// allow next pagebeforecreate to pass again
				// self.options.$infinity = ''; 			
		
		},
		
		// panel hashchange handler
		panelHash: function( e, data ) {
				
				// console.log("panelHash fired");				
				
				// remove panelHash again
				var self = this;														
				
				// stop Android for 500ms
				window.setTimeout(function () { self.options.$blockMultiClick = false; }, 500);												
				
				// check for history-panels
				$panels = $('div:jqmData(wrapper="true").ui-page-active div:jqmData(hash="history")'),
				n = $panels.length;
					
				// setup stack array
				longest = [],
				longestLen = 0;					
				
				// block hashChanges firing from regular JQM transition, 
				// when the plugin panel history is active, it keeps the
				// $.mobile.urlHistory.stack at length saved at init. 
				// Therefore a stack higher than 1 should not be possible 
				// on a wrapper. 
				// This is needed for dialogs. Check to see if it breaks something else!
				if ( $.mobile.urlHistory.stack.length > self.options.$jqmHistoryStackAtInit ) {	
					// console.log("block 4");
					return;
					}
								
				// this blocks hashChange calls set from panel-based transitions
				// otherwise the panelHash will fire two transitions! 	
				// $hashJoker enables more than one subsequent backward transitions			
				// $allowCrumbsHashToPass allows backwards transitions from crumbs buttons to pass					
				/*
				if ( self.options.$ignoreMyOwnNextHashChange == false  && self.options.$hashJoker == 0 && self.options.$allowCrumbsHashToPass != true ) {
					console.log("block 1");
					// self.options.$ignoreMyOwnNextHashChange = true;					
					self.options.$hashJoker = 1;					
					return;
					}
									
*/									
				/*
				if ( self.options.$ignoreMyOwnNextHashChange == false ) {
					console.log("block 1 - set to true, this blocks a hashchange!");
					self.options.$ignoreMyOwnNextHashChange = true;										
					return;
					}
				*/
				// first context hashChange is correctly blocked before, 
				// 2nd one passes and is stopped here				
				if ( self.options.$contextBlockNextHashChange == true ) {						
				// console.log("block 2");
					self.options.$contextBlockNextHashChange = false;
					self.options.$blockContextScrollTop = true;						
					return;
					}
			/*		
				// block pagination hashChanges				
				if ( self.options.$blockPaginationHashChange == true ) {					
				console.log("block 3");
					self.options.$blockPaginationHashChange = false;					
					return;
					}
			*/	
				// --------------------------- panel history rountine ------------------------
				// works like this:
				// * every panel with data-hash="history" gets a history stack on panel-init
				// * panel stacks receive entries (hash only) on every changePage
				// * initial stack height = 1 = panel page withd data-show = first
				// * popover panel stacks only increase while visible and are reset to 1 when the panel hides
				// * popover panel stacks always supercede all other panels 
				// * = first undo the panel, then the rest
				// * main&menu stack increase together, so if you change page on menu
				// * main gets a "yield" entry. So they always have the same stack height
				// on every transition plugin checks all stacks for the heightest
				// a new array is created from the heighest stacks (may be more than one)
				// only when all panels are on the same height (should be =1) JQM is allowed
				// to do a regular hashChange.
				
				// example: 3 higehst stacks with 2 entries each, the combo-array longest[]
				// will contain 3 arrays [array1, array2, array3] and each array will contain two entries
				
				// if there are panels with active history, check them
				
				if (n) {					
					$panels.each(function(){					
						var data = $(this).data("stack");										
						if(data.length > longestLen){					
								longest = [data];
								longestLen = data.length;							
								}
								else if(data.length == longestLen) {
									longest.push(data);																					
									}
							});							
					}				

					
			// (1) TODO: remove longest.length/n, because it fails if main/menu at 2 = 2/2=1
			if ( n==1 || longest.length/n !== 1 || longestLen > 1 ) {  								
				// for example 4 stacks, height 2,2,2,4 > longest.length = 1 /n=4 = 0,25 = panelHistory							
				// (a) first check if a popover is active with a stack>1, this will be reduced first
				var activePop = $('.ui-panel-active.ui-popover');																	
				
				if ( activePop.length>0 && activePop.data("stack").length > 1 ) {								
					// console.log("active popover");
					var pickFromStack = activePop.data("stack"),
						gotoPage = pickFromStack[pickFromStack.length-2];															
					} else {						
						// console.log("active menu/main gotoPage = ");
						// (b) if all popovers are reset, check for highest fullwidth or main/menu panel								
						var gotoPage = self._mmHandler ( longest.length, longest, longestLen);	
						// console.log( gotoPage )
						} 
				
					// need to declare fromPage here, because otherwise JQM removes .ui-page-active from the wrong panel (= active page in main panel);
					//var fromPage = $( gotoPage ).closest('div:jqmData(role="panel")').find('.ui-page-active'),
					//	changePageOptions = { fromPage: fromPage, pageContainer: $( gotoPage ).closest('div:jqmData(role="panel")'), fromHashChange: true, changeHash: true };													
					// $.mobile.changePage ( gotoPage, changePageOptions );							
					
				} else {							
					// this is a longshot for now: 
					// if a user goes back to the first page of the panel, the window.history will be @+1
					// which is the first page in the panel. The user can now click "close" (ok) or tap the
					// screen somewhere (ok). But... if the clicks the browser back button, this will reduce
					// the window.history by 1 and un-sync the history counter. So if the user really presses, 
					// he should end up here and then we should hideAllPanels? because this will also fire 
					// a browserReset thereby hiding any open popovers and re-syncing with window.history.
					// Not sure if this works all the way though, especially with menu/main panels. 													
					// window.history.back();	
					
					self.hideAllPanels("hashChange deadend #1");			
					return;
					}	
											
				// console.log("vorher");
				// console.log( data );
				
				
				var fromPage = $( gotoPage ).closest('div:jqmData(role="panel")').find('.ui-page-active');
				// enhance first page - should be done on init of wrapper page, otherwise on iPad this enhancement is too late on the first panel transition
				// fromPage.page();
				data.options.pageContainer = $( gotoPage ).closest('div:jqmData(role="panel")');
				data.options.fromPage = fromPage;
				data.options.changeHash = true;
				data.options.transition = "slide";				
				data.options.reverse = true;
				data.toPage = gotoPage;								
				
				// console.log("nachher");
											
				// as we have now made a transition, we need to block the next one coming from behind
				// same as in changePage handler															
				// self.options.$ignoreMyOwnNextHashChange = false;																
				
				// reset crumbs button pass
				// self.options.$allowCrumbsHashToPass = false;
				
				// unblock for the next click event
				$('html').data({'clickInProgress':false })
				
				// reduce panel stacks	
				// console.log("stackdown to= "+gotoPage );
				self.stackDown( "panelHash", e, data );
				
				// Clear active classes
				self.clearActiveClasses( "panelHash", true, $(gotoPage), fromPage );
				
				// not sure I need to set this.
				// $.mobile.firstPage[ 0 ] = gotoPage;	

				//make sure wrapper page stays activePage		
				$.mobile.activePage = $('div:jqmData(wrapper="true")');
				
				// reset page container to prevent regular JQM loading pages into a container
				// pageContainer will be re-set on next panel-transition to correct panel,
				// but if a regular JQM transition fires pageContainer would be stuck at the 
				// panel the last page was loaded into. Therefore reset (like for the loader:
				$.mobile.pageContainer == $('body') ? $.mobile.pageContainer : $('body'); 
			
		},
		
		panelDeepLink: function () {
			
			
			// load deeplinked pages						
			var self = this,
				// grab deeplink from HTML tag
				$deepPage = $( $('html').data("multiviewDeeplink") ),
				$deepPanel = $deepPage.closest('div:jqmData(role="panel")'),
				$deepPanelID = $deepPage.closest('div:jqmData(role="panel")').jqmData('id'),
				$deepFrom = $deepPanel.find('div:jqmData(show="first")'),
				$triggerButton;
							
							
			// if the deeplink page is on a popover
			if ( $deepPanel.jqmData("panel") == "popover" ) {	
				$triggerButton = $('div:jqmData(wrapper="true")').find('.toggle_popover:jqmData(panel="'+$deepPanelID+'")');																												
				}
						
			// make sure, first panel page is not enhanced, if deeplinking to a panel page other than 
			// data-show="first" page				
			if ($deepFrom.attr('id') != $deepPage.attr('id') ) { 								
				$deepFrom.removeClass('ui-page-active');
				}	
		
				
			// this needs a timeout, otherwise popovers will be closed
			// before opening by the last loading scrollTop (not sure, 
			// but deeplinked popovers won't open without a Timeout
			
				// show popover if there is one, but only if it's not visible already				
				if ($triggerButton && $deepPanel.attr('status') != 'visible' ) {
					$triggerButton.trigger('click'); 
					}
				
				// make sure, there is no trailing hashChange messing things up
				// self.options.$ignoreMyOwnNextHashChange = false;
								
				// load deeplink page
				$.mobile.changePage($deepPage, {fromPage:$deepFrom, transition:"slide", reverse:true, changeHash:false, pageContainer:$deepPanel});				
				
			
			// tidy up HTML deeplink
			$('html').removeData("multiviewDeeplink");
			
			},
		
/* -------------------------------------- EVENT BINDINGS -------------------------------------- */

		_mainEventBindings: function () {
	
			var self = this;						

			// history stack management with crumbs buttons active
            $(document).on('click', 'a.ui-crumbs', function (e) {				
				// console.log("crumbs click");
				// self.options.$allowCrumbsHashToPass = true; 				
				});	
	
			// toggle popover
			$(document).on('click','a.toggle_popover', function(e) {				
				self.showPanel(e, $(this));
				});
						
			// panel context loading listener
			$(document).on("click", function( e, data ) {
				
				// block empty links - otherwise dead links set option clickInProgress to false
				// which is only un-set after pagechange or hashchange transitions...
				// TODO: find a better way to do this
				if ( $(e.target).attr('href') == "#" || $(e.target).attr('href') == "") {					
					return;
					}
								
				// as self.findclosestLink returns wrong element, only way to pass link is this... sucks
				self.clickRouter( e, data, "click");								
				});

			// click panel transition listener
			$(document).on("vclick", function( e, data ) {
				// need to bind to vclick, because binding to click = 300ms, so it not possible
				// to pass event data to options and retrieve them in panelTrans, because by
				// the time click fires, panelTrans has already run.
				// vclick however fires way before panelTrans, so this is used to store
				// click related information
				
				// same as above
				if ( $(e.target).attr('href') == "#" || $(e.target).attr('href') == "") {
					return;
					}
					
				// as above... sucks
				self.clickRouter( e, data, "vclick" );
				});
			
			// panel transition handler 
			$(document).on( "pagebeforechange", function( e, data ) {													
								
				var	$link = self.options.$stageEvent,		
					$targetPanelID = $( $link ).jqmData('panel'),					
					$targetPanel = $link ? $('div:jqmData(id="'+$targetPanelID+'")') : data.options.pageContainer;
				
				// console.log("pagebeforechange, checking for panel");
				// modify changePage options on panel transitions, either through link data-panel or changePage pageContainer option
				if ( $targetPanel != $.mobile.pageContainer && typeof data.toPage === "string" ) {								
			
					// this used to be inside panelTrans and panelHash, but on iOS this is too late to override any default
					// activeIndex JQM assigns. Also setting this in _setup function for the initial page
					// this is necessary, because otherwise on iOS3, active is undefinded when retrieving the panel-transition
					// maintain active history entry, should always be stack@init-1									
					// console.log( "init="+self.options.$jqmHistoryStackAtInit+" active="+$.mobile.urlHistory.activeIndex)
					$.mobile.urlHistory.activeIndex = self.options.$jqmHistoryStackAtInit;
					// console.log( "init="+self.options.$jqmHistoryStackAtInit+" active="+$.mobile.urlHistory.activeIndex)
								
					// stop if coming from a hashChange event
					if ( data.options.fromHashChange == true ) {				
						//console.log("pagebeforechange-HASH");
						// reroute to panelHash
						self.panelHash( e, data );	
						//return;
						} else {
						//console.log("pagebeforechange-TRANS");
							// reroute to panelTrans							
							self.panelTrans( e, data );
							}
		
					
					}
				});			
			
			// panel backwards transition listener
			$(window).on('hashchange', function(e) {				
				if ( self.options.$blockMultiClick == false ) {										
					self.options.$blockMultiClick = true;
					
					// same as button click handler - only set options here, panelHash will be fired from pagebeforechange!
					//self.options.$ignoreMyOwnNextHashChange = false;
					// self.options.$crumbsBlockStackUp = true;
				
					// self.panelHash( e, location.hash, location.pathname+""+location.hash );												
					}
				});					
			
							
			// make sure header is at css:top 0 when closing keyboard in iOS
			$(document).on("blur","div:jqmData(wrapper='true') input", function () {			
				$(".ui-header-fixed, .ui-element-fixed-top" ).css("top","0 !important");
				});	
	
			// consolidate unique elements across DOM and reset panel historys on inactive panels									
			$(document).on('pagebeforehide', 'div:jqmData(role="page").basePage', function(e, data) {
				
				// if we are going to a non-nested page (pull in a new page)
				if ( data.nextPage.closest('.ui-panel').length == 0 ) {
					
					// reset window.history to new level
					// console.log("reset $windowHistoryAtInit to "+window.history.length+" und JQM is@ "+self.options.$jqmHistoryStackAtInit+" stack@init="+self.options.$windowHistoryAtInit);
					// self.options.$windowHistoryAtInit = window.history.length
					self.options.$windowHistoryManualCounter == 0;
					
					// hide open panels on fromPage
					self.hideAllPanels("#wrapper-hide")
					
					// reset history on fromPage
					self.historyDump( $(this).find('.ui-popover') );										
					
					// reset laststand
					$('html').data("lastStand", "");										
				
					// consolidate unique elements				
					$(this).find(':jqmData(unique="true")').each(function(i){						
						
						var	uniqueID = $(this).jqmData("unique-id"),
							nextPage = data.nextPage,
							nextUnique = nextPage.find( ":jqmData(unique-id='"+uniqueID+"')" ),
							nextUniqueID = nextUnique.jqmData('unique-id') === uniqueID;
									
						// if toPage and fromPage have a unique element with 
						// identical uniqueID, the fromPage element will be 
						// appended to the toPage and removed from fromPage
						if ( nextUniqueID == true ) {							
							nextUnique.empty().append( $(this).html() );			
							$(this).empty();							
							}	
						
						});	   														
					}								
				})
		
			// listener for plugin setup on trigger wrapper-page and subsequent wrappers added 
			// to the DOM. This also sets up crumbify buttons
			// TODO: Think about separating...						
			$(document).on('pagebeforeshow', 'div:jqmData(role="page")', function(event, data){																	

				var page = $(this);					
					
				// if the page being shown is a nested page make sure history is unwound 
				// needed, because back-btn adds an entry to the jqm history stack, which
				// can't be removed from inside stackup/stackdown. This ensures, that
				// browser back-button and crumbs back button work together.				
				if ( page.parents('div:jqmData(wrapper="true")').length > 0 ) {					
					self.unwindHistory();
					}

				// if pageshow is for a wrapper-page, setup the plugin
				if ( page.jqmData('wrapper') == true ) {	
					
					// make sure visible panels have an active first-page on backwards transitions
					if ( page.find('.ui-panel[status="visible"] .ui-page-active').length == 0 ) { 
						page.find('div:jqmData(show="first")').addClass('ui-page-active');
						}
					
					// if it's a deeplink page, fire panelDeeplink
					if ( $('html').data("multiviewDeeplink") && page.find( $('html').data("multiviewDeeplink")+"" ).length >= 1  ) {																								
						self.panelDeepLink();
						}
					
					// the setup for wrappers should only run once, which is
					if ( page.data("counter") == 0 || typeof page.data("counter") == 'undefined') {							
										
						self.setupMultiview(event, page);
						
						// .....hard... because it seems not possible to 
						// live('pagecreate/pageload/pageinit') to the wrapper
						// page alone. Such a binding fires with every panel
						// changepage, so it's not possible to set a flag on a wrapper 
						// to block the setup from firing more than once. Using "one"
						// instead of "live" also does not work, because then you
						// cannot catch the 2nd wrapper page loaded into the DOM.
						// $(this).die(), also doesn't seem to work. 
						
						// The whole thing is necessary, because the plugin setup
						// adds active-page to the first page on every panel. If
						// I let this fire with every changePage, the firstpage 
						// will never loose active-page and thus always be visible
						// If I omit this call, the 2nd wrapper page loaded into 
						// the DOM will not get the plugin setup and be blank.
						
						// What this does: The counter for the first wrapper page
						// is set to 0 on plugin-init so it runs through here once,
						// gets changed to 1 and thus is blocked from going through
						// again. If a new wrapper is loaded it doesn't have any , 
						// counter so I'm also letting "undefined" pass and then set 
						// the counter for this wrapper to 1, so on the next changePage,  
						// pageshow will fire on the wrapper page, but as counter is now 
						// 1, it will not run through here. This took a while...
						var inc = 1;
						page.data("counter", 0+inc);						
						} else {
							// wrapper already is in the DOM, just update the layout	
							self.panelWidth();						
							}
					// the crumbs part	
					// as it's a wrapper page we don't need crumble buttons on it, so stop here
					event.preventDefault();					
					} else if ( page.closest('div:jqmData(role="panel")').jqmData('hash') && page.jqmData("show") != "first" ){	

						// fires crumble every time a page is created
						// by checking for a closest panel, we ensure it's not fired on a regular JQM page!	
						// need to delay this, otherwise this runs before the history stacks are updated, 10ms seems enough						
						window.setTimeout(function() {								
							self.crumble(event, data, page );	
							}, 50);
						} 
				});

			// fire splitviewCheck on orientationchange (and resize)
			$(window).on('orientationchange', function(event){					
				self.splitScreen(event);					
				self.panelWidth();
				self.panelHeight();
				self.gulliver();
				});																						
			
			}
		
	});

/* -------------------------------------- PLUGIN TRIGGER -------------------------------------- */
	
// plugin flag
$('html').data("lockup","unlocked");

// initialize single DOM instance of multiview with first wrapper page
var trigger = $(document).on('pagecreate', 'div:jqmData(wrapper="true")',function(event){ 	
		
	if ($('html').data("lockup") == "unlocked") {		
		// initialize a counter to avoid setup of plugin firing with every pageshow
		$( this ).data("counter",0);		
		$( this ).multiview();
		$('html').data("lockup","locked");
	}
});

}) (jQuery,this);


/* -------------------------------------- OVERTHROW -------------------------------------- */

/*! Overthrow v.0.1.0. An overflow:auto polyfill for responsive design. (c) 2012: Scott Jehl, Filament Group, Inc. http://filamentgroup.github.com/Overthrow/license.txt */

(function( w, undefined ){
	
	var doc = w.document,
		docElem = doc.documentElement,
		classtext = "overthrow-enabled",
	
		// Touch events are used in the polyfill, and thus are a prerequisite
		canBeFilledWithPoly = "ontouchmove" in doc,
		
		// The following attempts to determine whether the browser has native overflow support
		// so we can enable it but not polyfill
		overflowProbablyAlreadyWorks = 
			// Features-first. iOS5 overflow scrolling property check - no UA needed here. thanks Apple :)
			"WebkitOverflowScrolling" in docElem.style ||
			// Touch events aren't supported and screen width is greater than X
			// ...basically, this is a loose "desktop browser" check. 
			// It may wrongly opt-in very large tablets with no touch support.
			( !canBeFilledWithPoly && w.screen.width > 1200 ) ||
			// Hang on to your hats.
			// Whitelist some popular, overflow-supporting mobile browsers for now and the future
			// These browsers are known to get overlow support right, but give us no way of detecting it.
			(function(){
				var ua = w.navigator.userAgent,
					// Webkit crosses platforms, and the browsers on our list run at least version 534
					webkit = ua.match( /AppleWebKit\/([0-9]+)/ ),
					wkversion = webkit && webkit[1],
					wkLte534 = webkit && wkversion >= 534;
					
				return (
					/* Android 3+ with webkit gte 534
					~: Mozilla/5.0 (Linux; U; Android 3.0; en-us; Xoom Build/HRI39) AppleWebKit/534.13 (KHTML, like Gecko) Version/4.0 Safari/534.13 */
					ua.match( /Android ([0-9]+)/ ) && RegExp.$1 >= 3 && wkLte534 ||
					/* Blackberry 7+ with webkit gte 534
					~: Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0 Mobile Safari/534.11+ */
					ua.match( / Version\/([0-9]+)/ ) && RegExp.$1 >= 0 && w.blackberry && wkLte534 ||
					/* Blackberry Playbook with webkit gte 534
					~: Mozilla/5.0 (PlayBook; U; RIM Tablet OS 1.0.0; en-US) AppleWebKit/534.8+ (KHTML, like Gecko) Version/0.0.1 Safari/534.8+ */   
					ua.indexOf( /PlayBook/ ) > -1 && RegExp.$1 >= 0 && wkLte534 ||
					/* Firefox Mobile (Fennec) 4 and up
					~: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.7; rv:2.1.1) Gecko/ Firefox/4.0.2pre Fennec/4.0. */
					ua.match( /Fennec\/([0-9]+)/ ) && RegExp.$1 >= 4 ||
					/* WebOS 3 and up (TouchPad too)
					~: Mozilla/5.0 (hp-tablet; Linux; hpwOS/3.0.0; U; en-US) AppleWebKit/534.6 (KHTML, like Gecko) wOSBrowser/233.48 Safari/534.6 TouchPad/1.0 */
					ua.match( /wOSBrowser\/([0-9]+)/ ) && RegExp.$1 >= 233 && wkLte534 ||
					/* Nokia Browser N8
					~: Mozilla/5.0 (Symbian/3; Series60/5.2 NokiaN8-00/012.002; Profile/MIDP-2.1 Configuration/CLDC-1.1 ) AppleWebKit/533.4 (KHTML, like Gecko) NokiaBrowser/7.3.0 Mobile Safari/533.4 3gpp-gba 
					~: Note: the N9 doesn't have native overflow with one-finger touch. wtf */
					ua.match( /NokiaBrowser\/([0-9\.]+)/ ) && parseFloat(RegExp.$1) === 7.3 && webkit && wkversion >= 533
				);
			})(),
			
		// Easing can use any of Robert Penner's equations (http://www.robertpenner.com/easing_terms_of_use.html). By default, overthrow includes ease-out-cubic
		// arguments: t = current iteration, b = initial value, c = end value, d = total iterations
		// use w.overthrow.easing to provide a custom function externally, or pass an easing function as a callback to the toss method
		defaultEasing = function (t, b, c, d) {
			return c*((t=t/d-1)*t*t + 1) + b;
		},	
			
		enabled = false,
		
		// Keeper of intervals
		timeKeeper,
				
		/* toss scrolls and element with easing
		
		// elem is the element to scroll
		// options hash:
			* left is the desired horizontal scroll. Default is "+0". For relative distances, pass a string with "+" or "-" in front.
			* top is the desired vertical scroll. Default is "+0". For relative distances, pass a string with "+" or "-" in front.
			* duration is the number of milliseconds the throw will take. Default is 100.
			* easing is an optional custom easing function. Default is w.overthrow.easing. Must follow the easing function signature 
		*/
		toss = function( elem, options ){
			var i = 0,
				sLeft = elem.scrollLeft,
				sTop = elem.scrollTop,
				// Toss defaults
				o = {
					top: "+0",
					left: "+0",
					duration: 100,
					easing: w.overthrow.easing
				},
				endLeft, endTop;
			
			// Mixin based on predefined defaults
			if( options ){
				for( var j in o ){
					if( options[ j ] !== undefined ){
						o[ j ] = options[ j ];
					}
				}
			}
			
			// Convert relative values to ints
			// First the left val
			if( typeof o.left === "string" ){
				o.left = parseFloat( o.left );
				endLeft = o.left + sLeft;
			}
			else {
				endLeft = o.left;
				o.left = o.left - sLeft;
			}
			// Then the top val
			if( typeof o.top === "string" ){
				o.top = parseFloat( o.top );
				endTop = o.top + sTop;
			}
			else {
				endTop = o.top;
				o.top = o.top - sTop;
			}

			timeKeeper = setInterval(function(){					
				if( i++ < o.duration ){
					elem.scrollLeft = o.easing( i, sLeft, o.left, o.duration );
					elem.scrollTop = o.easing( i, sTop, o.top, o.duration );
				}
				else{
					if( endLeft !== elem.scrollLeft ){
						elem.scrollLeft = endLeft;
					}
					if( endTop !== elem.scrollTop ){
						elem.scrollTop = endTop;
					}
					intercept();
				}
			}, 1 );
			
			// Return the values, post-mixin, with end values specified
			return { top: endTop, left: endLeft, duration: o.duration, easing: o.easing };
		},
		
		// find closest overthrow (elem or a parent)
		closest = function( target, ascend ){
			return !ascend && target.className && target.className.indexOf( "overthrow" ) > -1 && target || closest( target.parentNode );
		},
				
		// Intercept any throw in progress
		intercept = function(){
			clearInterval( timeKeeper );
		},
			
		// Enable and potentially polyfill overflow
		enable = function(){
				
			// If it's on, 
			if( enabled ){
				return;
			}
			// It's on.
			enabled = true;
				
			// If overflowProbablyAlreadyWorks or at least the element canBeFilledWithPoly, add a class to cue CSS that assumes overflow scrolling will work (setting height on elements and such)
			if( overflowProbablyAlreadyWorks || canBeFilledWithPoly ){
				docElem.className += " " + classtext;
			}
				
			// Destroy everything later. If you want to.
			w.overthrow.forget = function(){
				// Strip the class name from docElem
				docElem.className = docElem.className.replace( classtext, "" );
				// Remove touch binding (check for method support since this part isn't qualified by touch support like the rest)
				if( doc.removeEventListener ){
					doc.removeEventListener( "touchstart", start, false );
				}
				// reset easing to default
				w.overthrow.easing = defaultEasing;
				
				// Let 'em know
				enabled = false;
			};
	
			// If overflowProbablyAlreadyWorks or it doesn't look like the browser canBeFilledWithPoly, our job is done here. Exit viewport left.
			if( overflowProbablyAlreadyWorks || !canBeFilledWithPoly ){
				return;
			}

			// Fill 'er up!
			// From here down, all logic is associated with touch scroll handling
				// elem references the overthrow element in use
			var elem,
				
				// The last several Y values are kept here
				lastTops = [],
		
				// The last several X values are kept here
				lastLefts = [],
				
				// lastDown will be true if the last scroll direction was down, false if it was up
				lastDown,
				
				// lastRight will be true if the last scroll direction was right, false if it was left
				lastRight,
				
				// For a new gesture, or change in direction, reset the values from last scroll
				resetVertTracking = function(){
					lastTops = [];
					lastDown = null;
				},
				
				resetHorTracking = function(){
					lastLefts = [];
					lastRight = null;
				},
				
				// After releasing touchend, throw the overthrow element, depending on momentum
				finishScroll = function(){
					// Come up with a distance and duration based on how 
					// Multipliers are tweaked to a comfortable balance across platforms
					var top = ( lastTops[ 0 ] - lastTops[ lastTops.length -1 ] ) * 8,
						left = ( lastLefts[ 0 ] - lastLefts[ lastLefts.length -1 ] ) * 8,
						duration = Math.max( Math.abs( left ), Math.abs( top ) ) / 8;
					
					// Make top and left relative-style strings (positive vals need "+" prefix)
					top = ( top > 0 ? "+" : "" ) + top;
					left = ( left > 0 ? "+" : "" ) + left;
					
					// Make sure there's a significant amount of throw involved, otherwise, just stay still
					if( !isNaN( duration ) && duration > 0 && ( Math.abs( left ) > 80 || Math.abs( top ) > 80 ) ){
						toss( elem, { left: left, top: top, duration: duration } );
					}
				},
			
				// On webkit, touch events hardly trickle through textareas and inputs
				// Disabling CSS pointer events makes sure they do, but it also makes the controls innaccessible
				// Toggling pointer events at the right moments seems to do the trick
				// Thanks Thomas Bachem http://stackoverflow.com/a/5798681 for the following
				inputs,
				setPointers = function( val ){
					inputs = elem.querySelectorAll( "textarea, input" );
					for( var i = 0, il = inputs.length; i < il; i++ ) {
						inputs[ i ].style.pointerEvents = val;
					}
				},
				
				// For nested overthrows, changeScrollTarget restarts a touch event cycle on a parent or child overthrow
				changeScrollTarget = function( startEvent, ascend ){
					if( doc.createEvent ){
						var newTarget = ( !ascend || ascend === undefined ) && elem.parentNode || elem.touchchild || elem,
							tEnd;
								
						if( newTarget !== elem ){
							tEnd = doc.createEvent( "HTMLEvents" );
							tEnd.initEvent( "touchend", true, true );
							elem.dispatchEvent( tEnd );
							newTarget.touchchild = elem;
							elem = newTarget;
							newTarget.dispatchEvent( startEvent );
						}
					}
				},
				
				// Touchstart handler
				// On touchstart, touchmove and touchend are freshly bound, and all three share a bunch of vars set by touchstart
				// Touchend unbinds them again, until next time
				start = function( e ){
					
					// Stop any throw in progress
					intercept();
					
					// Reset the distance and direction tracking
					resetVertTracking();
					resetHorTracking();
						
					elem = closest( e.target );
						
					if( !elem || elem === docElem || e.touches.length > 1 ){
						return;
					}			

					setPointers( "none" );
					var touchStartE = e,
						scrollT = elem.scrollTop,
						scrollL = elem.scrollLeft,
						height = elem.offsetHeight,
						width = elem.offsetWidth,
						startY = e.touches[ 0 ].pageY,
						startX = e.touches[ 0 ].pageX,
						scrollHeight = elem.scrollHeight,
						scrollWidth = elem.scrollWidth,
					
						// Touchmove handler
						move = function( e ){
						
							var ty = scrollT + startY - e.touches[ 0 ].pageY,
								tx = scrollL + startX - e.touches[ 0 ].pageX,
								down = ty >= ( lastTops.length ? lastTops[ 0 ] : 0 ),
								right = tx >= ( lastLefts.length ? lastLefts[ 0 ] : 0 );
								
							// If there's room to scroll the current container, prevent the default window scroll
							if( ( ty > 0 && ty < scrollHeight - height ) || ( tx > 0 && tx < scrollWidth - width ) ){
								e.preventDefault();
							}
							// This bubbling is dumb. Needs a rethink.
							else {
								changeScrollTarget( touchStartE );
							}
							
							// If down and lastDown are inequal, the y scroll has changed direction. Reset tracking.
							if( lastDown && down !== lastDown ){
								resetVertTracking();
							}
							
							// If right and lastRight are inequal, the x scroll has changed direction. Reset tracking.
							if( lastRight && right !== lastRight ){
								resetHorTracking();
							}
							
							// remember the last direction in which we were headed
							lastDown = down;
							lastRight = right;							
							
							// set the container's scroll
							elem.scrollTop = ty;
							elem.scrollLeft = tx;
						
							lastTops.unshift( ty );
							lastLefts.unshift( tx );
						
							if( lastTops.length > 3 ){
								lastTops.pop();
							}
							if( lastLefts.length > 3 ){
								lastLefts.pop();
							}
						},
					
						// Touchend handler
						end = function( e ){
							// Apply momentum based easing for a graceful finish
							finishScroll();	
							// Bring the pointers back
							setPointers( "auto" );
							setTimeout( function(){
								setPointers( "none" );
							}, 450 );
							elem.removeEventListener( "touchmove", move, false );
							elem.removeEventListener( "touchend", end, false );
						};
					
					elem.addEventListener( "touchmove", move, false );
					elem.addEventListener( "touchend", end, false );
				};
				
			// Bind to touch, handle move and end within
			doc.addEventListener( "touchstart", start, false );
		};
		
	// Expose overthrow API
	w.overthrow = {
		set: enable,
		forget: function(){},
		easing: defaultEasing,
		toss: toss,
		intercept: intercept,
		closest: closest,
		support: overflowProbablyAlreadyWorks ? "native" : canBeFilledWithPoly && "polyfilled" || "none"
	};
	
	// Auto-init
	enable();
		
})( this );

/*! hashscroll overthrow.js extension: eased scroll to elements via hashchange, within an overthrow element. (c) 2012: Scott Jehl, Filament Group, Inc. Dual MIT/BSD license */
(function( w, undefined ){
	// set the hash-based links to scroll to a desired location
	if( w.overthrow && w.addEventListener ){
		
		function scrollToElem ( elem ){
			// XXX FREQUENT FIX: Issue #7
			overthrow.intercept();
			var throwParent = overthrow.closest( elem );
			if( throwParent ){
				overthrow.toss(
					throwParent,
					{ 
						left: elem.offsetLeft - throwParent.offsetLeft,
						top: elem.offsetTop - throwParent.offsetTop
					}
				);	
			}
		}
		
		w.document.addEventListener( "click", function( e ){					
		
			// XXX FREQUENT, block right-click	
			var link = e.target, 
				xLink = $( findClosestLink(e.target) );			
			
			if ( !xLink || xLink.length == 0 || e.which > 1) {					
					return;
					} 	

			if( link && link.className.indexOf( "throw" ) > -1 ){
				var hash = link.href.split( "#" )[ 1 ],
					elem = w.document.getElementById( hash );
					
				if( elem ){
					e.preventDefault();
					scrollToElem( elem );
					w.location.hash = hash;
				}	
			}	
		}, false);
						
		function findClosestLink(ele) {	
			var self = this;
			while (ele){
				if (ele.nodeName.toLowerCase() == "a"){
					break;
					}
				ele = ele.parentNode;
				}
			return ele;
			}	
		
	}		
})( this );