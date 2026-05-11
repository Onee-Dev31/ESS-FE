/**
 * Bubbly - Bootstrap 5 Dashboard & CMS Theme v. 1.3.2
 * Homepage:
 * Copyright 2023, Bootstrapious - https://bootstrapious.com
 */

"use strict";

document.addEventListener("DOMContentLoaded", function () {
    function hidePreloader() {
        var preloader = document.querySelector(".spinner-wrapper");
        preloader.classList.add("opacity-0");
    }

    setTimeout(function () {
        hidePreloader();
    }, 2000);
});
