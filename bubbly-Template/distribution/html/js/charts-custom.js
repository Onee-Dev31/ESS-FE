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

    const lineChartCustom1 = new Chart(document.getElementById("lineChartCustom1"), {
        type: "line",
        options: {
            tooltips: {
                mode: "index",
                intersect: false,
            },
            legend: { display: false },
            scales: {
                xAxes: [
                    {
                        display: true,
                    },
                ],
                yAxes: [
                    {
                        display: true,
                    },
                ],
            },
        },
        data: {
            labels: ["January", "February", "March", "April", "May", "June", "July"],
            datasets: [
                {
                    label: "Data Set One",
                    fill: true,
                    lineTension: 0.3,
                    backgroundColor: window.gradients.whiteBlue,
                    borderColor: window.gradients.whiteBlue,
                    borderCapStyle: "butt",
                    borderDash: [],
                    borderDashOffset: 0.0,
                    borderJoinStyle: "miter",
                    borderWidth: 1,
                    pointBorderColor: window.gradients.whiteBlue,
                    pointBackgroundColor: "#fff",
                    pointBorderWidth: 1,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: "#fff",
                    pointHoverBorderColor: window.colors.primary,
                    pointHoverBorderWidth: 2,
                    pointRadius: 1,
                    pointHitRadius: 15,
                    data: [30, 50, 40, 61, 42, 35, 40],
                    spanGaps: false,
                },
                {
                    label: "Data Set Two",
                    fill: true,
                    lineTension: 0.3,
                    backgroundColor: pinkBlue,
                    borderColor: pinkBlue,
                    borderCapStyle: "butt",
                    borderDash: [],
                    borderDashOffset: 0.0,
                    borderJoinStyle: "miter",
                    borderWidth: 1,
                    pointBorderColor: pinkBlue,
                    pointBackgroundColor: "#fff",
                    pointBorderWidth: 1,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: "#fff",
                    pointHoverBorderColor: window.colors.pink,
                    pointHoverBorderWidth: 2,
                    pointRadius: 1,
                    pointHitRadius: 15,
                    data: [50, 40, 50, 40, 45, 40, 30],
                    spanGaps: false,
                },
            ],
        },
    });

    // ------------------------------------------------------- //
    // Line Chart
    // ------------------------------------------------------ //

    const lineChartCustom2 = new Chart(document.getElementById("lineChartCustom2"), {
        type: "line",
        options: {
            tooltips: {
                mode: "index",
                intersect: false,
            },
            scales: {
                xAxes: [
                    {
                        display: false,
                    },
                ],
                yAxes: [
                    {
                        ticks: {
                            max: 30,
                            min: 0,
                        },
                        gridLines: {
                            display: true,
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
            labels: ["January", "February", "March", "April", "May", "June", "July"],
            datasets: [
                {
                    label: "Referrals",
                    fill: true,
                    backgroundColor: window.gradients.primaryWhite,
                    borderColor: window.colors.primary,
                    pointBorderColor: window.colors.primary,
                    pointHoverBackgroundColor: window.colors.primary,
                    borderCapStyle: "butt",
                    borderDash: [],

                    borderJoinStyle: "miter",
                    borderWidth: 2,
                    pointBackgroundColor: window.colors.primary,
                    pointBorderWidth: 5,
                    pointHoverRadius: 5,
                    pointHoverBorderColor: window.colors.primary,
                    pointHoverBorderWidth: 1,
                    pointRadius: 0,
                    pointHitRadius: 2,
                    data: [13, 21, 13, 17, 13, 20, 15],
                    spanGaps: false,
                },
            ],
        },
    });

    // ------------------------------------------------------- //
    // Donut Chart
    // ------------------------------------------------------ //
    const donut1 = new Chart(document.getElementById("donut1"), {
        type: "doughnut",
        options: {
            cutoutPercentage: 70,
            legend: {},
        },
        data: {
            labels: ["Tasks Done", "Remaining"],
            datasets: [
                {
                    data: [250, 200],
                    borderWidth: [0, 0],
                    backgroundColor: [window.colors.cyan, "#eee"],
                    hoverBackgroundColor: [window.colors.cyan, "#eee"],
                },
            ],
        },
    });

    // ------------------------------------------------------- //
    // Donut Chart
    // ------------------------------------------------------ //
    const donut2 = new Chart(document.getElementById("donut2"), {
        type: "doughnut",
        options: {
            cutoutPercentage: 90,
            legend: {
                display: false,
            },
        },
        data: {
            labels: ["First", "Second"],
            datasets: [
                {
                    data: [300, 50],
                    borderWidth: [0, 0],
                    backgroundColor: [window.colors.blue, "#eee"],
                    hoverBackgroundColor: [window.colors.blue, "#eee"],
                },
            ],
        },
    });

    // ------------------------------------------------------- //
    // Bar Chart
    // ------------------------------------------------------ //
    const barChartExample = new Chart(document.getElementById("barChartExample"), {
        type: "bar",
        options: {
            scales: {
                xAxes: [
                    {
                        display: false,
                    },
                ],
                yAxes: [
                    {
                        display: true,
                        gridLines: {
                            color: "#eee",
                        },
                    },
                ],
            },
        },
        data: {
            labels: ["January", "February", "March", "April", "May", "June", "July"],
            datasets: [
                {
                    label: "Data Set 1",
                    backgroundColor: window.colors.primary,
                    hoverBackgroundColor: window.colors.primary,
                    borderColor: window.colors.primary,
                    borderWidth: 1,
                    data: [65, 59, 80, 81, 56, 55, 40],
                },
                {
                    label: "Data Set 2",
                    backgroundColor: window.colors.pinkLighter,
                    hoverBackgroundColor: window.colors.pinkLighter,
                    borderColor: window.colors.pinkLighter,
                    borderWidth: 1,
                    data: [35, 40, 60, 47, 88, 27, 30],
                },
            ],
        },
    });

    // ------------------------------------------------------- //
    // Bar Chart 2
    // ------------------------------------------------------ //

    const barChart2 = new Chart(document.getElementById("barChart2"), {
        type: "bar",
        options: {
            scales: {
                xAxes: [
                    {
                        display: true,
                        gridLines: {
                            color: "#fff",
                        },
                    },
                ],
                yAxes: [
                    {
                        display: true,
                        ticks: {
                            max: 100,
                            min: 20,
                        },
                        gridLines: {
                            color: "#fff",
                        },
                    },
                ],
            },
            legend: false,
        },
        data: {
            labels: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14"],
            datasets: [
                {
                    label: "Sunny Days",
                    backgroundColor: pinkBlue,
                    hoverBackgroundColor: pinkBlue,
                    borderColor: pinkBlue,
                    borderWidth: 0,
                    data: [65, 59, 80, 81, 56, 55, 40, 30, 45, 80, 44, 36, 66, 58],
                },
            ],
        },
    });

    // ------------------------------------------------------- //
    // Donut Chart
    // ------------------------------------------------------ //

    const donut3 = new Chart(document.getElementById("donut3"), {
        type: "doughnut",
        options: {
            cutoutPercentage: 70,
        },
        data: {
            labels: ["Sandra", "Becky", "Julie", "Romero"],
            datasets: [
                {
                    data: [250, 50, 100, 40],

                    backgroundColor: ["#0d6efd", "#3d8bfd", "#6ea8fe", "#9ec5fe"],
                    hoverBackgroundColor: ["#0d6efd", "#3d8bfd", "#6ea8fe", "#9ec5fe"],
                },
            ],
        },
    });

    // ------------------------------------------------------- //
    // Pie Chart
    // ------------------------------------------------------ //

    const pieChartCustom3 = new Chart(document.getElementById("pieChartCustom3"), {
        type: "pie",
        data: {
            labels: ["John", "Mark", "Frank", "Danny"],
            datasets: [
                {
                    data: [300, 50, 100, 80],
                    backgroundColor: ["#6610f2", "#8540f5", "#a370f7", "#c29ffa"],
                    hoverBackgroundColor: ["#6610f2", "#8540f5", "#a370f7", "#c29ffa"],
                },
            ],
        },
    });
});
