/**
 * ============================================================================
 * TALKAOR AI — Official Website Script Controller
 * Pure Vanilla JavaScript • Zero External Dependencies
 * ============================================================================
 */

(function () {
  "use strict";

  // --------------------------------------------------------------------------
  // 1. WebGL Audio Waveform Background Shader
  // --------------------------------------------------------------------------
  const canvas = document.getElementById("shader-canvas");
  if (canvas) {
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl) {
      const vertexShaderSource = `
        attribute vec3 position;
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `;

      const fragmentShaderSource = `
        precision highp float;
        uniform vec2 resolution;
        uniform float time;
        uniform float xScale;
        uniform float yScale;
        uniform float distortion;

        void main() {
          vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
          
          float d = length(p) * distortion;
          
          float rx = p.x * (1.0 + d);
          float gx = p.x;
          float bx = p.x * (1.0 - d);

          float r = 0.05 / abs(p.y + sin((rx + time) * xScale) * yScale);
          float g = 0.05 / abs(p.y + sin((gx + time) * xScale) * yScale);
          float b = 0.05 / abs(p.y + sin((bx + time) * xScale) * yScale);
          
          gl_FragColor = vec4(r, g, b, 1.0);
        }
      `;

      function compileShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          console.error("Shader compile error:", gl.getShaderInfoLog(shader));
          gl.deleteShader(shader);
          return null;
        }
        return shader;
      }

      const vertShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
      const fragShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

      if (vertShader && fragShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertShader);
        gl.attachShader(program, fragShader);
        gl.linkProgram(program);

        if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
          gl.useProgram(program);

          const quadVertices = new Float32Array([
            -1.0, -1.0, 0.0,
             1.0, -1.0, 0.0,
            -1.0,  1.0, 0.0,
             1.0, -1.0, 0.0,
            -1.0,  1.0, 0.0,
             1.0,  1.0, 0.0,
          ]);

          const vertexBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

          const posAttrib = gl.getAttribLocation(program, "position");
          gl.enableVertexAttribArray(posAttrib);
          gl.vertexAttribPointer(posAttrib, 3, gl.FLOAT, false, 0, 0);

          const resolutionLoc = gl.getUniformLocation(program, "resolution");
          const timeLoc = gl.getUniformLocation(program, "time");
          const xScaleLoc = gl.getUniformLocation(program, "xScale");
          const yScaleLoc = gl.getUniformLocation(program, "yScale");
          const distLoc = gl.getUniformLocation(program, "distortion");

          const shaderParams = {
            currentXScale: 1.0,
            currentYScale: 0.5,
            currentDistortion: 0.05,
          };

          function handleResize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const displayWidth = Math.floor(window.innerWidth * dpr);
            const displayHeight = Math.floor(window.innerHeight * dpr);

            if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
              canvas.width = displayWidth;
              canvas.height = displayHeight;
            }

            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
          }

          window.addEventListener("resize", handleResize);
          handleResize();

          let time = 0.0;
          function animate() {
            time += 0.01;
            gl.uniform1f(timeLoc, time);
            gl.uniform1f(xScaleLoc, shaderParams.currentXScale);
            gl.uniform1f(yScaleLoc, shaderParams.currentYScale);
            gl.uniform1f(distLoc, shaderParams.currentDistortion);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            requestAnimationFrame(animate);
          }
          animate();
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // 2. Mobile Menu Navigation
  // --------------------------------------------------------------------------
  const mobileToggle = document.getElementById("mobile-toggle");
  const mobileNav = document.getElementById("mobile-nav");

  if (mobileToggle && mobileNav) {
    mobileToggle.addEventListener("click", () => {
      mobileNav.classList.toggle("open");
    });

    mobileNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        mobileNav.classList.remove("open");
      });
    });
  }

  // --------------------------------------------------------------------------
  // 3. Contact Form (Frontend-only)
  // --------------------------------------------------------------------------
  const contactForm = document.getElementById("contact-form");
  const formStatusMsg = document.getElementById("form-status-msg");

  if (contactForm && formStatusMsg) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const nameInput = document.getElementById("contact-name");
      const name = nameInput ? nameInput.value : "there";

      formStatusMsg.className = "form-status success";
      formStatusMsg.textContent = `Thank you, ${name}! Your message has been sent. We'll be in touch shortly.`;

      contactForm.reset();
      setTimeout(() => {
        formStatusMsg.textContent = "";
      }, 6000);
    });
  }

  // --------------------------------------------------------------------------
  // 4. Smooth Anchor & Button Scrolling
  // --------------------------------------------------------------------------
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href");
      if (targetId && targetId !== "#") {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          targetElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }
    });
  });

  document.querySelectorAll("[data-scroll-to]").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      const targetSelector = this.getAttribute("data-scroll-to");
      if (targetSelector) {
        const targetElement = document.querySelector(targetSelector);
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }
    });
  });

  document.querySelectorAll("[data-href]").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      const targetHref = this.getAttribute("data-href");
      if (targetHref) {
        window.location.href = targetHref;
      }
    });
  });

  // --------------------------------------------------------------------------
  // 5. Stacking / Pile-up Cards Scroll Physics
  // --------------------------------------------------------------------------
  const stackCards = document.querySelectorAll(".stack-card");
  if (stackCards.length > 0) {
    const handleCardStack = () => {
      stackCards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const topOffset = 80 + index * 22;
        if (rect.top <= topOffset + 8) {
          const nextCard = stackCards[index + 1];
          if (nextCard) {
            const nextRect = nextCard.getBoundingClientRect();
            const nextTop = 80 + (index + 1) * 22;
            const distance = Math.max(0, nextRect.top - nextTop);
            const progress = Math.min(1, Math.max(0, 1 - distance / 320));
            const scale = 1 - progress * 0.04;
            const brightness = 1 - progress * 0.15;
            card.style.transform = `scale(${scale})`;
            card.style.filter = `brightness(${brightness})`;
          }
        } else {
          card.style.transform = "scale(1)";
          card.style.filter = "brightness(1)";
        }
      });
    };

    window.addEventListener("scroll", handleCardStack, { passive: true });
    window.addEventListener("resize", handleCardStack, { passive: true });
    handleCardStack();
  }

  // --------------------------------------------------------------------------
  // 6. Pricing Cards Converging Slide-in Observer
  // --------------------------------------------------------------------------
  const pricingGrid = document.getElementById("pricing-grid");
  if (pricingGrid) {
    if ("IntersectionObserver" in window) {
      const pricingObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              pricingGrid.classList.add("in-view");
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
      );
      pricingObserver.observe(pricingGrid);
    } else {
      pricingGrid.classList.add("in-view");
    }
  }

})();
