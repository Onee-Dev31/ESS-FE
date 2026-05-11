/**
 * Bubbly - Bootstrap 5 Dashboard & CMS Theme v. 1.3.2
 * Homepage:
 * Copyright 2023, Bootstrapious - https://bootstrapious.com
 */

"use strict";

document.addEventListener("DOMContentLoaded", function () {
    const textRemove = new Choices(document.getElementById("tags"), {
        delimiter: ",",
        editItems: true,
        removeItemButton: true,
    });

    const datepicker = new Datepicker(document.getElementById("datePublished"), {
        buttonClass: "btn",
        format: "mm/dd/yyyy",
        autohide: true,
    });

    const quillSnow = new Quill("#editor-container", {
        modules: {
            toolbar: "#toolbar-container",
        },
        placeholder: "Compose an epic...",
        theme: "snow", // Specify theme in configuration
    });
});
