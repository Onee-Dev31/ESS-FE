/**
 * Bubbly - Bootstrap 5 Dashboard & CMS Theme v. 1.3.2
 * Homepage:
 * Copyright 2023, Bootstrapious - https://bootstrapious.com
 */

"use strict";

document.addEventListener("DOMContentLoaded", function () {
    var quillSnow = new Quill("#editor-container", {
        modules: {
            toolbar: "#toolbar-container",
        },
        placeholder: "Compose an epic...",
        theme: "snow", // Specify theme in configuration
    });

    var quillBubble = new Quill("#editorBubble", {
        theme: "bubble", // Specify theme in configuration
    });
});
