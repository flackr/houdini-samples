/*
Copyright 2016 Google, Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
document.addEventListener('DOMContentLoaded', function() {
  window.flagIsSet = function(flagName) {
    return document.location.search.indexOf(flagName) !== -1;
  };

  var rafScheduled = false;
  var tick = function(timestamp) {
    var offset = -0.1 * scroller.scrollTop;
    window.parallax.style.transform = 'translate(0, ' + offset + 'px)';
    requestAnimationFrame(tick);
    rafScheduled = false;
  };

  if (!flagIsSet('nojank')) {
    // Lets burn some time in the main thread;
    // up to 120ms per frame.
    requestAnimationFrame(function jankRAF(timestamp) {
      var delay = 120 * Math.random();
      while (window.performance.now() - timestamp < delay) {}
      requestAnimationFrame(jankRAF);
    });
  }

  window.scroller = document.querySelector('.scroll');
  window.parallax = document.querySelector('.parallax');
  window.document.querySelector('button').onclick = function() {
    window.scroller.scrollTop = window.scroller.scrollHeight;
  };

  window.scroller.style.backfaceVisibility = 'hidden';
  if (false) {
    console.log('Using main thread rAF');
    // Force scrolling text field and image on their own comp layer
    window.parallax.style.willChange = 'transform';
    window.scroller.onscroll = function() {
      // Only schedule rAF once per frame
      if (!rafScheduled) {
        requestAnimationFrame(tick);
      }
      rafScheduled = true;
    };
  } else {
    var worklet;

    if (window.animationWorklet && window.animationWorklet.addModule) {
      console.log('Using native animation worklet');
      worklet = window.animationWorklet;
    } else {
      console.log('Using polyfill worklet that runs on main thread');
      worklet = window.animationWorkletPolyfill;
    }

    // Wait one frame to ensure scroller is available and composited!
    // TODO: This is just a temp hack and we should remove it once we can
    // handle non-composited scrollers.
    window.requestAnimationFrame( _ => {
      worklet.addModule('parallax-animator.js').then( _ => {
        console.log('parallax animator is loaded. Starting animation.');

        var scrollRange = scroller.scrollHeight - scroller.clientHeight;
        var scrollTimeline = new ScrollTimeline({scrollSource: scroller, orientation: 'block', timeRange: 1000})

        var effect = new KeyframeEffect(parallax,
                                        [{'transform': 'translateY(0)'}, {'transform': 'translateY(' + -scrollRange + 'px)'}],
                                        {duration: 1000, iterations: Infinity});
        window.parallaxAnimator = new WorkletAnimation('parallax', [effect], scrollTimeline, {});
        window.parallaxAnimator.play();
      });
    });
  }
});