/**
 * Bubbly - Bootstrap 5 Dashboard & CMS Theme v. 1.3.2
 * Homepage:
 * Copyright 2023, Bootstrapious - https://bootstrapious.com
 */

"use strict";

document.addEventListener("DOMContentLoaded", function () {
    var barChart = new Chart(document.getElementById("barChart"), {
        type: "bar",
        data: {
            labels: [
                "Oct 5",
                "Oct 6",
                "Oct 7",
                "Oct 8",
                "Oct 9",
                "Oct 10",
                "Oct 11",
                "Oct 12",
                "Oct 13",
                "Oct 14",
                "Oct 15",
            ],
            datasets: [
                {
                    label: "Organic Search",
                    data: [
                        328, 500, 408, 612, 423, 354, 405, 399, 256, 398, 414,
                    ],
                    backgroundColor: "#4650dd",
                    barPercentage: 0.7,
                },
                {
                    label: "Facebook Ads",
                    data: [
                        150, 230, 382, 204, 169, 290, 300, 100, 300, 255, 458,
                        236,
                    ],
                    backgroundColor: "#d0d2f3",
                    barPercentage: 0.7,
                },
            ],
        },
        options: {
            legend: false,
            scales: {
                yAxes: [
                    {
                        gridLines: {
                            color: "#e9ecef",
                            drawBorder: false,
                            zeroLineColor: "#e9ecef ",
                        },
                        ticks: {
                            beginAtZero: true,
                            stepSize: 100,
                            fontSize: 12,
                            fontColor: "#97a4af",
                            padding: 10,
                        },
                    },
                ],
                xAxes: [
                    {
                        gridLines: {
                            display: false,
                            drawBorder: false,
                        },
                        ticks: {
                            fontSize: 12,
                            fontColor: "#97a4af",
                            padding: 5,
                        },
                        categoryPercentage: 0.5,
                        maxBarThickness: 15,
                    },
                ],
            },

            tooltips: {
                mode: "index",
                intersect: false,
                callbacks: {
                    label: function (tooltipItem, data) {
                        var label =
                            data.datasets[tooltipItem.datasetIndex].label || "";

                        if (label) {
                            label += ": ";
                        }
                        label += "$" + tooltipItem.yLabel;
                        return label;
                    },
                },
            },
            hover: {
                mode: "nearest",
                intersect: true,
            },
        },
    });

    const ordersDataTable = new simpleDatatables.DataTable("#ordersDatatable", {
        columns: [
            // Disable sorting on the first column
            //{ select: [0], sortable: false },
        ],
        perPage: 5,
    });

    // Add Bulk Actions Select & Bootstrap styles to the elements
    // in the header
    ordersDataTable.on("datatable.init", function () {
        const select = document.getElementById("categoryBulkActionOrders");
        const header = document.querySelector(
            ".dataTable-top .dataTable-dropdown"
        );

        header.prepend(select);

        const input = document.querySelector(".dataTable-input");
        input.classList.add("form-control", "form-control-sm");

        const dataTableSelect = document.querySelector(".dataTable-selector");
        dataTableSelect.classList.add("form-select", "form-select-sm");

        const dataTableContainer = document.querySelector(
            ".dataTable-container"
        );
        dataTableContainer.classList.add("border-0");
    });

    // Fade in after init
    ordersDataTable.on("datatable.init", function (args) {
        document
            .getElementById("ordersDatatable")
            .closest(".preload-wrapper")
            .classList.add("opacity-10");
    });

    // ------------------------------------------------------- //
    // Donut Chart
    // ------------------------------------------------------ //

    const donut3 = new Chart(document.getElementById("donut3"), {
        type: "doughnut",
        options: {
            cutoutPercentage: 70,
            legend: false,
        },
        data: {
            labels: ["Sandra", "Becky", "Julie", "Romero"],
            datasets: [
                {
                    data: [250, 50, 100, 40],

                    backgroundColor: [
                        "#0d6efd",
                        "#3d8bfd",
                        "#6ea8fe",
                        "#9ec5fe",
                    ],
                    hoverBackgroundColor: [
                        "#0d6efd",
                        "#3d8bfd",
                        "#6ea8fe",
                        "#9ec5fe",
                    ],
                },
            ],
        },
    });

    // ------------------------------------------------------- //
    // Pie Chart
    // ------------------------------------------------------ //

    const pieChartCustom3 = new Chart(
        document.getElementById("pieChartCustom3"),
        {
            type: "pie",
            options: {
                legend: false,
            },
            data: {
                labels: ["John", "Mark", "Frank", "Danny"],
                datasets: [
                    {
                        data: [300, 50, 100, 80],
                        backgroundColor: [
                            "#6610f2",
                            "#8540f5",
                            "#a370f7",
                            "#c29ffa",
                        ],
                        hoverBackgroundColor: [
                            "#6610f2",
                            "#8540f5",
                            "#a370f7",
                            "#c29ffa",
                        ],
                    },
                ],
            },
        }
    );
});
