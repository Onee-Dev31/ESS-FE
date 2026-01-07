/**
 * Bubbly - Bootstrap 5 Dashboard & CMS Theme v. 1.3.2
 * Homepage:
 * Copyright 2023, Bootstrapious - https://bootstrapious.com
 */

"use strict";

document.addEventListener("DOMContentLoaded", function () {
    var toastElList = [].slice.call(document.querySelectorAll(".toast"));

    var toastList = toastElList.map(function (toastEl) {
        return new bootstrap.Toast(toastEl);
    });

    var toastButtonList = [].slice.call(document.querySelectorAll(".toast-btn"));

    toastButtonList.map(function (toastButtonEl) {
        toastButtonEl.addEventListener("click", function () {
            var toastToTrigger = document.getElementById(toastButtonEl.dataset.target);

            if (toastToTrigger) {
                var toast = bootstrap.Toast.getInstance(toastToTrigger);
                toast.show();
            }
        });
    });
});
