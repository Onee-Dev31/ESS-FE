/**
 * Bubbly - Bootstrap 5 Dashboard & CMS Theme v. 1.3.2
 * Homepage:
 * Copyright 2023, Bootstrapious - https://bootstrapious.com
 */

"use strict";

document.addEventListener("DOMContentLoaded", function () {
    const dataTable = new simpleDatatables.DataTable("#productsDatatable", {
        columns: [
            // Disable sorting on the first column
            { select: [0], sortable: false },
        ],
    });

    function adjustTableColumns() {
        let columns = dataTable.columns;

        if (window.innerWidth > 900) {
            columns.show([1, 3, 4, 5]);
        } else if (window.innerWidth > 600) {
            columns.hide([4, 5]);
            columns.show([1, 3]);
        } else {
            columns.hide([1, 3, 4, 5]);
        }
    }

    adjustTableColumns();

    window.addEventListener("resize", adjustTableColumns);

    // Add Bulk Actions Select & Bootstrap styles to the elements
    // in the header
    dataTable.on("datatable.init", function () {
        const select = document.getElementById("categoryBulkAction");
        const header = document.querySelector(".dataTable-top .dataTable-dropdown");

        header.prepend(select);

        const input = document.querySelector(".dataTable-input");
        input.classList.add("form-control", "form-control-sm");

        const dataTableSelect = document.querySelector(".dataTable-selector");
        dataTableSelect.classList.add("form-select", "form-select-sm");

        const dataTableContainer = document.querySelector(".dataTable-container");
        dataTableContainer.classList.add("border-0");
    });

    // Fade in after init
    dataTable.on("datatable.init", function (args) {
        document.getElementById("productsDatatable").closest(".preload-wrapper").classList.add("opacity-10");
    });
});
