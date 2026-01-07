/**
 * Bubbly - Bootstrap 5 Dashboard & CMS Theme v. 1.3.2
 * Homepage:
 * Copyright 2023, Bootstrapious - https://bootstrapious.com
 */

"use strict";

document.addEventListener("DOMContentLoaded", function () {
    // ------------------------------------------------------- //
    // Line Chart
    // ------------------------------------------------------ //

    var lineChart1 = new Chart(document.getElementById("lineChart1"), {
        type: "line",
        options: {
            tooltips: {
                mode: "index",
                intersect: false,
            },
            hover: {
                mode: "nearest",
                intersect: true,
            },
            scales: {
                xAxes: [
                    {
                        gridLines: {
                            display: false,
                            drawBorder: false,
                        },
                    },
                ],
                yAxes: [
                    {
                        ticks: {
                            max: 30,
                            min: 0,
                        },
                        gridLines: {
                            display: false,
                            drawBorder: false,
                        },
                    },
                ],
            },

            legend: {
                display: false,
            },
        },
        data: {
            labels: [
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
            ],
            datasets: [
                {
                    label: "Closed Projects",
                    fill: true,
                    backgroundColor: "transparent",
                    borderColor: window.colors.blue,
                    pointBorderColor: window.colors.blue,
                    pointHoverBackgroundColor: window.colors.blue,
                    borderCapStyle: "butt",
                    borderDash: [],
                    borderDashOffset: 0.0,
                    borderJoinStyle: "miter",
                    borderWidth: 3,
                    pointBackgroundColor: "blue",
                    pointBorderWidth: 5,
                    pointHoverRadius: 5,
                    pointRadius: 0,
                    pointHitRadius: 1,
                    data: [20, 14, 21, 15, 22, 8, 18],
                    spanGaps: false,
                },
            ],
        },
    });

    // ------------------------------------------------------- //
    // Pie Chart
    // ------------------------------------------------------ //

    var pieChartHome1 = new Chart(document.getElementById("pieChartHome1"), {
        type: "doughnut",
        options: {
            cutoutPercentage: 90,
            legend: {
                display: false,
            },
        },
        data: {
            labels: ["Hours Worked", "Hours Remaining"],
            datasets: [
                {
                    data: [250, 200],
                    borderWidth: [0, 0],
                    backgroundColor: [window.colors.green, "#eee"],
                    hoverBackgroundColor: [window.colors.green, "#eee"],
                },
            ],
        },
    });

    // ------------------------------------------------------- //
    // Pie Chart
    // ------------------------------------------------------ //

    var pieChartHome2 = new Chart(document.getElementById("pieChartHome2"), {
        type: "doughnut",
        options: {
            cutoutPercentage: 90,
            legend: {
                display: false,
            },
        },
        data: {
            labels: ["Completed", "Remaining"],
            datasets: [
                {
                    data: [300, 50],
                    borderWidth: [0, 0],
                    backgroundColor: [window.colors.indigo, "#eee"],
                    hoverBackgroundColor: [window.colors.indigo, "#eee"],
                },
            ],
        },
    });
});
