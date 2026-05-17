/**
 * Scroll Position Preservation Script
 * 
 * This script preserves scroll position when navigating from a listing page 
 * to a product details page and back. It works by:
 * 1. Detecting when user is on a listing page (collection/category/search)
 * 2. Storing scroll position before navigation
 * 3. Restoring scroll position when returning via back button
 * 4. Handling both browser back button and custom back navigation
 */

(function() {
    'use strict';
    
    // Configuration
    const SCROLL_STORAGE_KEY = 'zp_listing_scroll_position';
    const SCROLL_RESTORATION_DELAY = 100; // ms delay for scroll restoration
    
    // State variables
    let isListingPage = false;
    let scrollPosition = 0;
    let isNavigatingToProduct = false;
    let lastScrollTime = 0;
    
    /**
     * Check if current page is a listing page
     */
    function isListingPageView() {
        return window.zs_view === 'category' || 
               window.zs_view === 'collection' || 
               window.zs_view === 'search-products' ||
               window.location.pathname.includes('/category/') ||
               window.location.pathname.includes('/collection/') ||
               window.location.pathname.includes('/search-products');
    }
    
    /**
     * Check if current page is a product page
     */
    function isProductPageView() {
        return window.zs_view === 'product' || 
               window.location.pathname.includes('/product/');
    }
    
    /**
     * Store scroll position in sessionStorage
     */
    function storeScrollPosition() {
        if (isListingPage && scrollPosition > 0) {
            const scrollData = {
                position: scrollPosition,
                timestamp: Date.now(),
                url: window.location.href
            };
            sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(scrollData));
        }
    }
    
    /**
     * Restore scroll position from sessionStorage
     */
    function restoreScrollPosition() {
        try {
            const scrollData = sessionStorage.getItem(SCROLL_STORAGE_KEY);
            if (scrollData) {
                const data = JSON.parse(scrollData);
                
                // Check if we're returning to the same listing page
                if (data.url === window.location.href && data.position > 0) {
                    // Delay restoration to ensure page is fully loaded
                    setTimeout(() => {
                        window.scrollTo({
                            top: data.position,
                            behavior: 'instant' // Use instant to avoid animation
                        });
                        
                        // Clear stored position after restoration
                        sessionStorage.removeItem(SCROLL_STORAGE_KEY);
                    }, SCROLL_RESTORATION_DELAY);
                }
            }
        } catch (error) {
            console.warn('Error restoring scroll position:', error);
        }
    }
    
    /**
     * Handle scroll events on listing pages
     */
    function handleScroll() {
        if (!isListingPage) return;
        
        // Throttle scroll events for better performance
        const now = Date.now();
        if (now - lastScrollTime < 100) return; // Throttle to 100ms
        lastScrollTime = now;
        
        scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    }
    
    /**
     * Handle navigation to product pages
     */
    function handleProductNavigation() {
        if (isListingPage && !isNavigatingToProduct) {
            isNavigatingToProduct = true;
            storeScrollPosition();
        }
    }
    
    /**
     * Handle browser back/forward navigation
     */
    function handlePopState() {
        if (isListingPageView()) {
            // We've returned to a listing page
            setTimeout(() => {
                restoreScrollPosition();
            }, 50);
        }
    }
    
    /**
     * Handle page visibility changes (for mobile apps)
     */
    function handleVisibilityChange() {
        if (!document.hidden && isListingPageView()) {
            // Page became visible again, check if we should restore scroll
            setTimeout(() => {
                restoreScrollPosition();
            }, 100);
        }
    }
    
    /**
     * Intercept product link clicks to store scroll position
     */
    function interceptProductLinks() {
        if (!isListingPage) return;
        
        // Find all product links
        const productLinks = document.querySelectorAll('a[href*="/product/"], a[data-zs-product-url]');
        
        productLinks.forEach(link => {
            // Remove existing listeners to avoid duplicates
            link.removeEventListener('click', handleProductNavigation);
            
            // Add new listener
            link.addEventListener('click', function(e) {
                // Only intercept if it's a navigation to product page
                if (this.href && this.href.includes('/product/')) {
                    handleProductNavigation();
                }
            });
        });
    }
    
    /**
     * Initialize scroll preservation functionality
     */
    function init() {
        // Determine page type
        isListingPage = isListingPageView();
        
        if (isListingPage) {
            // Set up scroll tracking
            window.addEventListener('scroll', handleScroll, { passive: true });
            
            // Set up product link interception
            interceptProductLinks();
            
            // Check for dynamic content loading
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        // New content added, check for product links
                        setTimeout(interceptProductLinks, 100);
                    }
                });
            });
            
            // Observe DOM changes for dynamic content
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            // Store initial scroll position if page was reloaded
            if (window.performance && window.performance.navigation.type === 1) {
                // Page was reloaded, check for stored scroll position
                setTimeout(restoreScrollPosition, 200);
            }
            
        } else if (isProductPageView()) {
            // We're on a product page, check if we should restore scroll when going back
            window.addEventListener('popstate', handlePopState);
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }
    }
    
    /**
     * Enhanced back navigation function
     * This can be called from custom back buttons
     */
    window.zpGoBack = function() {
        if (isProductPageView()) {
            // Store current state before going back
            const currentState = {
                url: window.location.href,
                timestamp: Date.now()
            };
            
            // Go back
            history.back();
            
            // If history.back() doesn't work, try to navigate to referrer
            setTimeout(() => {
                if (window.location.href === currentState.url) {
                    // history.back() didn't work, try referrer
                    if (document.referrer && document.referrer !== window.location.href) {
                        window.location.href = document.referrer;
                    }
                }
            }, 100);
        }
    };
    
    /**
     * Public API for manual scroll position management
     */
    window.zpScrollPreservation = {
        /**
         * Manually store current scroll position
         */
        storePosition: function() {
            if (isListingPage) {
                scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
                storeScrollPosition();
            }
        },
        
        /**
         * Manually restore scroll position
         */
        restorePosition: function() {
            restoreScrollPosition();
        },
        
        /**
         * Get current scroll position
         */
        getCurrentPosition: function() {
            return scrollPosition;
        },
        
        /**
         * Check if scroll position is stored
         */
        hasStoredPosition: function() {
            return !!sessionStorage.getItem(SCROLL_STORAGE_KEY);
        }
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Also initialize on page load for SPA-like behavior
    window.addEventListener('load', init);
    
    // Handle dynamic page changes (for SPA-like applications)
    if (window.history && window.history.pushState) {
        const originalPushState = window.history.pushState;
        const originalReplaceState = window.history.replaceState;
        
        window.history.pushState = function() {
            originalPushState.apply(this, arguments);
            setTimeout(init, 50);
        };
        
        window.history.replaceState = function() {
            originalReplaceState.apply(this, arguments);
            setTimeout(init, 50);
        };
    }
    
})(); 