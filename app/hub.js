
    (function () {
      var jump = document.getElementById("screenJump");
      var panes = document.querySelectorAll("[data-pane]");
      var current = "splash-client";
      var bookReturn = "pro-list";
      var emailReturn = "splash-client";
      var settingsReturn = "pro-list";
      var bookStep = "address";
      var booking = {
        addressText: "",
        shortText: "",
        day: null,
        time: null,
        extras: []
      };

      /* Frozen to the proto clock (status bar 9:41) so When matches booked-home sample dates. */
      var protoNow = new Date(2026, 7, 20, 9, 41, 0);
      var selectedDay = startOfDay(protoNow);
      var displayedMonth = startOfDay(protoNow);
      var selectedTime = null;
      var whenMode = "day";

      function startOfDay(d) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      }

      function addDays(d, n) {
        var x = new Date(d);
        x.setDate(x.getDate() + n);
        return x;
      }

      function fmt(d, pattern) {
        var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        var monthsLong = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return pattern
          .replace("EEEE", days[d.getDay()])
          .replace("MMMM", monthsLong[d.getMonth()])
          .replace("MMM", months[d.getMonth()])
          .replace("yyyy", String(d.getFullYear()))
          .replace("dd", String(d.getDate()));
      }

      function timeLabel(hour) {
        var suffix = hour >= 12 ? "PM" : "AM";
        var h = hour % 12;
        if (h === 0) h = 12;
        return h + ":00 " + suffix;
      }

      function dayHeading(d) { return fmt(d, "EEEE MMM dd"); }

      function weekStart(d) {
        return addDays(startOfDay(d), -d.getDay());
      }

      function weekHeading(d) {
        var start = weekStart(d);
        var end = addDays(start, 6);
        var year = end.getFullYear();
        if (start.getMonth() === end.getMonth()) {
          return fmt(start, "MMM dd") + " – " + end.getDate() + ", " + year;
        }
        return fmt(start, "MMM dd") + " – " + fmt(end, "MMM dd") + ", " + year;
      }

      function isPastDay(d) {
        return startOfDay(d) < startOfDay(protoNow);
      }

      function timeSlots() {
        var slots = [];
        for (var h = 7; h <= 20; h++) {
          var when = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate(), h, 0, 0);
          if (when > protoNow) slots.push(h);
        }
        return slots;
      }

      function shortAddress(text) {
        var part = text.split(",")[0].trim();
        return part || text;
      }

      function showPane(id) {
        for (var i = 0; i < panes.length; i++) {
          panes[i].classList.toggle("is-active", panes[i].getAttribute("data-pane") === id);
        }
      }

      function setJump(id) {
        if (jump.value !== id) jump.value = id;
      }

      function openSheet(layer, sheet) {
        sheet.hidden = false;
        layer.classList.add("is-open");
      }

      function closeSheet(layer, sheet, after) {
        layer.classList.remove("is-open");
        sheet.style.transform = "";
        sheet.classList.remove("is-dragging");
        window.setTimeout(function () {
          if (!layer.classList.contains("is-open")) sheet.hidden = true;
        }, 280);
        if (after) after();
      }

      var nextLayer = document.getElementById("nextLayer");
      var nextSheet = document.getElementById("nextSheet");
      var jobLayer = document.getElementById("jobLayer");
      var jobSheet = document.getElementById("jobSheet");

      function bindSheetDrag(sheet, onClose) {
        var startY = 0;
        var currentY = 0;
        var dragging = false;

        function onPointerDown(event) {
          if (event.target.closest(".sheet-close")) return;
          dragging = true;
          startY = event.clientY;
          currentY = 0;
          sheet.classList.add("is-dragging");
          sheet.setPointerCapture(event.pointerId);
        }

        function onPointerMove(event) {
          if (!dragging) return;
          currentY = Math.max(0, event.clientY - startY);
          sheet.style.transform = "translateY(" + currentY + "px)";
        }

        function onPointerUp() {
          if (!dragging) return;
          dragging = false;
          sheet.classList.remove("is-dragging");
          if (currentY > 80) onClose();
          else sheet.style.transform = "";
        }

        sheet.addEventListener("pointerdown", onPointerDown);
        sheet.addEventListener("pointermove", onPointerMove);
        sheet.addEventListener("pointerup", onPointerUp);
        sheet.addEventListener("pointercancel", onPointerUp);
      }

      function closeNextSheet() {
        closeSheet(nextLayer, nextSheet, function () {
          current = "booked-home";
          setJump("booked-home");
        });
      }

      function closeJobSheet() {
        closeSheet(jobLayer, jobSheet, function () {
          current = proHomeEmpty ? "pro-home-empty" : "pro-home";
          setJump(current);
        });
      }

      bindSheetDrag(nextSheet, closeNextSheet);
      bindSheetDrag(jobSheet, closeJobSheet);
      document.getElementById("nextClose").addEventListener("click", closeNextSheet);
      document.getElementById("jobClose").addEventListener("click", closeJobSheet);
      document.getElementById("nextMow").addEventListener("click", function () {
        go("next-mow-detail");
      });

      var stepAddress = document.getElementById("stepAddress");
      var stepWhen = document.getElementById("stepWhen");
      var stepExtras = document.getElementById("stepExtras");
      var stepConfirm = document.getElementById("stepConfirm");
      var bookContinue = document.getElementById("bookContinue");
      var addressField = document.getElementById("addressField");

      function setBookStep(step) {
        bookStep = step;
        stepAddress.classList.toggle("hidden", step !== "address");
        stepWhen.classList.toggle("hidden", step !== "when");
        stepExtras.classList.toggle("hidden", step !== "extras");
        stepConfirm.classList.toggle("hidden", step !== "confirm");
        if (step === "confirm") {
          bookContinue.textContent = "Book a Mow";
          bookContinue.disabled = false;
        } else if (step === "extras") {
          bookContinue.textContent = "Continue";
          bookContinue.disabled = false;
        } else if (step === "when") {
          bookContinue.textContent = "Continue";
          bookContinue.disabled = !selectedTime;
          renderWhen();
        } else {
          bookContinue.textContent = "Continue";
          bookContinue.disabled = !addressField.value.trim();
        }
      }

      function resetBook() {
        booking = { addressText: "", shortText: "", day: null, time: null, extras: [] };
        addressField.value = "";
        selectedDay = startOfDay(protoNow);
        displayedMonth = startOfDay(protoNow);
        selectedTime = null;
        whenMode = "day";
        var extras = document.querySelectorAll("[data-extra]");
        for (var i = 0; i < extras.length; i++) extras[i].classList.remove("is-on");
        var modes = document.querySelectorAll(".mode-picker button");
        for (var m = 0; m < modes.length; m++) {
          modes[m].setAttribute("aria-pressed", modes[m].getAttribute("data-mode") === "day" ? "true" : "false");
        }
        setBookStep("address");
      }

      function renderWeek() {
        var strip = document.getElementById("weekStrip");
        strip.innerHTML = "";
        var start = weekStart(selectedDay);
        for (var i = 0; i < 7; i++) {
          var day = addDays(start, i);
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "week-day";
          if (isPastDay(day)) btn.className += " is-past";
          if (startOfDay(day).getTime() === startOfDay(selectedDay).getTime()) btn.className += " is-selected";
          btn.innerHTML = "<small>" + fmt(day, "EEEE") + "</small><span>" + day.getDate() + "</span>";
          if (!isPastDay(day)) {
            btn.addEventListener("click", (function (d) {
              return function () {
                selectedDay = startOfDay(d);
                selectedTime = null;
                renderWhen();
              };
            })(day));
          } else {
            btn.disabled = true;
          }
          strip.appendChild(btn);
        }
      }

      function renderMonth() {
        var grid = document.getElementById("monthGrid");
        grid.innerHTML = "";
        var dows = ["S", "M", "T", "W", "T", "F", "S"];
        for (var i = 0; i < 7; i++) {
          var dow = document.createElement("div");
          dow.className = "month-dow";
          dow.textContent = dows[i];
          grid.appendChild(dow);
        }
        var first = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1);
        var leading = first.getDay();
        var lastDate = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 0).getDate();
        for (var b = 0; b < leading; b++) {
          grid.appendChild(document.createElement("div"));
        }
        for (var n = 1; n <= lastDate; n++) {
          var day = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), n);
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "month-cell";
          btn.textContent = String(n);
          if (isPastDay(day)) {
            btn.className += " is-past";
            btn.disabled = true;
          } else {
            if (startOfDay(day).getTime() === startOfDay(selectedDay).getTime()) btn.className += " is-selected";
            btn.addEventListener("click", (function (d) {
              return function () {
                selectedDay = startOfDay(d);
                selectedTime = null;
                renderWhen();
              };
            })(day));
          }
          grid.appendChild(btn);
        }
        document.getElementById("monthHeading").textContent = fmt(displayedMonth, "MMMM yyyy");
      }

      function renderTimes() {
        var list = document.getElementById("timeList");
        list.innerHTML = "";
        var slots = timeSlots();
        if (!slots.length) {
          var empty = document.createElement("p");
          empty.className = "when-sub";
          empty.textContent = "No times left today";
          list.appendChild(empty);
          return;
        }
        for (var i = 0; i < slots.length; i++) {
          var hour = slots[i];
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "choice" + (selectedTime === hour ? " is-on" : "");
          btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/></svg><span>' + timeLabel(hour) + "</span>" +
            (selectedTime === hour ? '<svg class="choice-grow" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 8l4 4 8-8"/></svg>' : "");
          btn.addEventListener("click", (function (h) {
            return function () {
              selectedTime = h;
              renderWhen();
            };
          })(hour));
          list.appendChild(btn);
        }
      }

      function renderWhen() {
        document.getElementById("dayHeading").textContent = dayHeading(selectedDay);
        document.getElementById("weekHeading").textContent = weekHeading(selectedDay);
        document.getElementById("weekCaption").textContent = "First visit — " + dayHeading(selectedDay);
        document.getElementById("whenAddressPill").textContent = booking.shortText || shortAddress(addressField.value) || "123 Greenway Dr";
        document.getElementById("whenDayHead").classList.toggle("hidden", whenMode !== "day");
        document.getElementById("whenWeekHead").classList.toggle("hidden", whenMode !== "week");
        document.getElementById("whenMonthHead").classList.toggle("hidden", whenMode !== "month");
        if (whenMode === "week") renderWeek();
        if (whenMode === "month") renderMonth();
        renderTimes();
        if (bookStep === "when") bookContinue.disabled = !selectedTime;
      }

      function selectedExtras() {
        var on = [];
        var buttons = document.querySelectorAll("[data-extra]");
        for (var i = 0; i < buttons.length; i++) {
          if (buttons[i].classList.contains("is-on")) on.push(buttons[i].getAttribute("data-extra"));
        }
        return on;
      }

      function fillConfirm() {
        booking.addressText = addressField.value.trim();
        booking.shortText = shortAddress(booking.addressText);
        booking.day = selectedDay;
        booking.time = selectedTime;
        booking.extras = selectedExtras();
        document.getElementById("confirmAddress").textContent = booking.addressText;
        document.getElementById("confirmWhen").textContent = dayHeading(selectedDay) + " · " + timeLabel(selectedTime);
        var extrasEl = document.getElementById("confirmExtras");
        if (booking.extras.length) {
          extrasEl.textContent = booking.extras.join(" · ");
          extrasEl.classList.remove("hidden");
        } else {
          extrasEl.classList.add("hidden");
        }
      }

      var proHomeEmpty = false;
      var proHomeTab = "appointments";
      var jobs = {
        greenway: {
          address: "123 Greenway Dr, Austin, TX 78704",
          when: "Sat Aug 22 · 9:00 AM",
          extras: "Edge · Blow",
          price: "$45"
        },
        cedar: {
          address: "440 Cedar Ln, Austin, TX 78704",
          when: "Mon Aug 24 · 11:00 AM",
          extras: "",
          price: "$45"
        }
      };

      function setProHome(opts) {
        proHomeEmpty = !!opts.empty;
        proHomeTab = opts.tab || "appointments";
        var tabs = document.querySelectorAll("[data-pro-tab]");
        for (var i = 0; i < tabs.length; i++) {
          tabs[i].setAttribute("aria-pressed", tabs[i].getAttribute("data-pro-tab") === proHomeTab ? "true" : "false");
        }
        document.getElementById("proAppointments").classList.toggle("hidden", proHomeTab !== "appointments");
        document.getElementById("proPayments").classList.toggle("hidden", proHomeTab !== "payments");
        document.getElementById("scheduleTitle").classList.toggle("hidden", proHomeTab === "payments");
        document.getElementById("apptList").classList.toggle("hidden", proHomeEmpty);
        document.getElementById("apptEmpty").classList.toggle("hidden", !proHomeEmpty);
      }

      function openJob(id) {
        var job = jobs[id] || jobs.greenway;
        document.getElementById("jobAddress").textContent = job.address;
        document.getElementById("jobWhen").textContent = job.when;
        var extras = document.getElementById("jobExtras");
        if (job.extras) {
          extras.textContent = job.extras;
          extras.classList.remove("hidden");
        } else {
          extras.classList.add("hidden");
        }
        document.getElementById("jobPrice").textContent = job.price;
        showPane("pro-home");
        setProHome({ empty: false, tab: "appointments" });
        openSheet(jobLayer, jobSheet);
      }

      function go(id, opts) {
        opts = opts || {};
        var fromDropdown = !!opts.fromDropdown;
        current = id;

        nextLayer.classList.remove("is-open");
        jobLayer.classList.remove("is-open");
        nextSheet.hidden = true;
        jobSheet.hidden = true;
        nextSheet.style.transform = "";
        jobSheet.style.transform = "";
        hideAlert();

        if (id === "next-mow-detail") {
          showPane("booked-home");
          openSheet(nextLayer, nextSheet);
        } else if (id === "job-detail") {
          openJob("greenway");
        } else if (id === "pro-home" || id === "pro-home-empty" || id === "pro-home-stripe") {
          showPane("pro-home");
          setProHome({
            empty: id === "pro-home-empty",
            tab: id === "pro-home-stripe" ? "payments" : "appointments"
          });
        } else if (id === "book-mow") {
          if (fromDropdown) resetBook();
          showPane("book-mow");
        } else if (id === "forgot") {
          if (fromDropdown) {
            document.getElementById("forgotForm").classList.remove("hidden");
            document.getElementById("forgotSent").classList.add("hidden");
            document.getElementById("resetEmail").value = "";
          }
          showPane("forgot");
        } else {
          if (id === "email" && opts.emailMode === "signUp") setEmailMode("signUp");
          else if (id === "email" && fromDropdown) setEmailMode("signIn");
          showPane(id);
        }

        setJump(id);
      }

      jump.addEventListener("change", function () {
        go(jump.value, { fromDropdown: true });
      });

      document.querySelectorAll("[data-pro-tab]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var tab = btn.getAttribute("data-pro-tab");
          setProHome({ empty: proHomeEmpty, tab: tab });
          current = tab === "payments"
            ? "pro-home-stripe"
            : (proHomeEmpty ? "pro-home-empty" : "pro-home");
          setJump(current);
        });
      });

      document.querySelectorAll("[data-job]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          current = "job-detail";
          setJump("job-detail");
          openJob(btn.getAttribute("data-job"));
        });
      });

      document.body.addEventListener("click", function (event) {
        var goBtn = event.target.closest("[data-go]");
        if (goBtn) {
          var dest = goBtn.getAttribute("data-go");
          if (dest === "book-mow") bookReturn = "pro-list";
          if (dest === "email") {
            emailReturn = current.indexOf("splash") === 0 ? current : "splash-client";
            go("email", { emailMode: goBtn.getAttribute("data-email-mode") || "signIn" });
          } else if (dest === "settings-client") {
            settingsReturn = current === "booked-home" || current === "pro-list-empty" || current === "next-mow-detail"
              ? (current === "next-mow-detail" ? "booked-home" : current)
              : "pro-list";
            go(dest);
          } else {
            go(dest);
          }
          return;
        }
        var signout = event.target.closest("[data-signout]");
        if (signout) {
          showAlert({
            title: "Sign out of Mow It?",
            message: signout.getAttribute("data-signout") === "onboarding"
              ? "Your profile setup won't be saved."
              : "You'll need to sign in again to book or manage jobs.",
            confirm: "Sign Out",
            onConfirm: function () { go("splash-client"); }
          });
          return;
        }
        var alertBtn = event.target.closest("[data-alert]");
        if (alertBtn && alertBtn.getAttribute("data-alert") === "delete") {
          showAlert({
            title: "Delete your account?",
            message: "You have 30 days to sign back in and undo this before your data is permanently erased.",
            confirm: "Delete Account",
            onConfirm: function () { go("splash-client"); }
          });
        }
      });

      document.getElementById("bookClose").addEventListener("click", function () {
        go(bookReturn);
      });
      document.getElementById("emailCancel").addEventListener("click", function () {
        go(emailReturn);
      });
      document.getElementById("settingsClientClose").addEventListener("click", function () {
        go(settingsReturn);
      });

      addressField.addEventListener("input", function () {
        if (bookStep === "address") bookContinue.disabled = !addressField.value.trim();
      });

      document.getElementById("useLocation").addEventListener("click", function () {
        addressField.value = "123 Greenway Dr, Austin, TX 78704";
        if (bookStep === "address") bookContinue.disabled = false;
      });

      document.querySelectorAll(".mode-picker button").forEach(function (btn) {
        btn.addEventListener("click", function () {
          whenMode = btn.getAttribute("data-mode");
          document.querySelectorAll(".mode-picker button").forEach(function (other) {
            other.setAttribute("aria-pressed", other === btn ? "true" : "false");
          });
          renderWhen();
        });
      });

      document.getElementById("prevMonth").addEventListener("click", function () {
        displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() - 1, 1);
        renderWhen();
      });

      document.getElementById("nextMonth").addEventListener("click", function () {
        displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1);
        renderWhen();
      });

      document.querySelectorAll("[data-extra]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          btn.classList.toggle("is-on");
        });
      });

      bookContinue.addEventListener("click", function () {
        if (bookStep === "address") {
          booking.addressText = addressField.value.trim();
          booking.shortText = shortAddress(booking.addressText);
          setBookStep("when");
        } else if (bookStep === "when") {
          if (!selectedTime) return;
          setBookStep("extras");
        } else if (bookStep === "extras") {
          fillConfirm();
          setBookStep("confirm");
        } else if (bookStep === "confirm") {
          go("booked-home");
        }
      });

      var modeSignIn = document.getElementById("modeSignIn");
      var modeSignUp = document.getElementById("modeSignUp");

      function setEmailMode(mode) {
        var signUp = mode === "signUp";
        modeSignIn.setAttribute("aria-pressed", signUp ? "false" : "true");
        modeSignUp.setAttribute("aria-pressed", signUp ? "true" : "false");
        document.getElementById("emailTitle").textContent = signUp ? "Sign Up" : "Sign In";
        document.getElementById("emailSubmit").textContent = signUp ? "Create Account" : "Sign In";
        document.getElementById("confirmRow").classList.toggle("hidden", !signUp);
        document.getElementById("passwordReqs").classList.toggle("hidden", !signUp);
        document.getElementById("suggestGroup").classList.toggle("hidden", !signUp);
        document.getElementById("forgotGroup").classList.toggle("hidden", signUp);
      }

      modeSignIn.addEventListener("click", function () { setEmailMode("signIn"); });
      modeSignUp.addEventListener("click", function () { setEmailMode("signUp"); });

      document.querySelectorAll("[data-eye]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var field = document.getElementById(btn.getAttribute("data-eye"));
          field.type = field.type === "password" ? "text" : "password";
          btn.setAttribute("aria-label", field.type === "password" ? "Show password" : "Hide password");
        });
      });

      document.getElementById("suggestPassword").addEventListener("click", function () {
        var letters = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
        var digits = "23456789";
        var specials = "!@#$%&*";
        var all = letters + digits + specials;
        var chars = [letters[2], digits[1], specials[0]];
        for (var i = chars.length; i < 16; i++) chars.push(all[i % all.length]);
        var generated = chars.join("");
        document.getElementById("passwordField").type = "text";
        document.getElementById("confirmField").type = "text";
        document.getElementById("passwordField").value = generated;
        document.getElementById("confirmField").value = generated;
      });

      document.getElementById("sendReset").addEventListener("click", function () {
        var email = document.getElementById("resetEmail").value.trim();
        if (!email || email.indexOf("@") < 0) return;
        document.getElementById("forgotForm").classList.add("hidden");
        document.getElementById("forgotSent").classList.remove("hidden");
        document.getElementById("forgotSentCopy").textContent =
          "If an account exists for " + email + ", we've sent a password reset link.";
      });

      function syncOnboard() {
        var name = document.getElementById("bizName").value.trim();
        var area = document.getElementById("serviceArea").value.trim();
        var any = document.querySelectorAll("#serviceToggles input:checked").length > 0;
        document.getElementById("onboardContinue").disabled = !(name && area && any);
      }

      document.getElementById("bizName").addEventListener("input", syncOnboard);
      document.getElementById("serviceArea").addEventListener("input", syncOnboard);
      document.querySelectorAll("#serviceToggles input").forEach(function (box) {
        box.addEventListener("change", syncOnboard);
      });
      document.getElementById("onboardContinue").addEventListener("click", function () {
        go("pro-home");
      });

      var alertLayer = document.getElementById("alertLayer");
      var alertAction = null;

      function showAlert(spec) {
        document.getElementById("alertTitle").textContent = spec.title;
        document.getElementById("alertMessage").textContent = spec.message;
        document.getElementById("alertConfirm").textContent = spec.confirm;
        alertAction = spec.onConfirm;
        alertLayer.classList.add("is-open");
      }

      function hideAlert() {
        alertLayer.classList.remove("is-open");
        alertAction = null;
      }

      document.getElementById("alertCancel").addEventListener("click", hideAlert);
      document.getElementById("alertConfirm").addEventListener("click", function () {
        var fn = alertAction;
        hideAlert();
        if (fn) fn();
      });

      go("splash-client");
    })();
  