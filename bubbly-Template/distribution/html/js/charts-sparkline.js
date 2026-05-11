/**
 * Bubbly - Bootstrap 5 Dashboard & CMS Theme v. 1.3.2
 * Homepage:
 * Copyright 2023, Bootstrapious - https://bootstrapious.com
 */

"use strict";

document.addEventListener("DOMContentLoaded", function () {
    function findClosest(target, tagName) {
        if (target.tagName === tagName) {
            return target;
        }

        while ((target = target.parentNode)) {
            if (target.tagName === tagName) {
                break;
            }
        }

        return target;
    }

    var btc = [
        { name: "Bitcoin", date: "2017-01-01", value: 967.6 },
        { name: "Bitcoin", date: "2017-02-01", value: 957.02 },
        { name: "Bitcoin", date: "2017-03-01", value: 1190.78 },
        { name: "Bitcoin", date: "2017-04-01", value: 1071.48 },
        { name: "Bitcoin", date: "2017-05-01", value: 1354.21 },
        { name: "Bitcoin", date: "2017-06-01", value: 2308.08 },
        { name: "Bitcoin", date: "2017-07-01", value: 2483.5 },
        { name: "Bitcoin", date: "2017-08-01", value: 2839.18 },
        { name: "Bitcoin", date: "2017-09-01", value: 4744.69 },
        { name: "Bitcoin", date: "2017-10-01", value: 4348.09 },
        { name: "Bitcoin", date: "2017-11-01", value: 6404.92 },
    ];

    var eth = [
        { name: "Ethereum", date: "2017-01-01", value: 8.3 },
        { name: "Ethereum", date: "2017-02-01", value: 10.57 },
        { name: "Ethereum", date: "2017-03-01", value: 15.73 },
        { name: "Ethereum", date: "2017-04-01", value: 49.51 },
        { name: "Ethereum", date: "2017-05-01", value: 85.69 },
        { name: "Ethereum", date: "2017-06-01", value: 226.51 },
        { name: "Ethereum", date: "2017-07-01", value: 246.65 },
        { name: "Ethereum", date: "2017-08-01", value: 213.87 },
        { name: "Ethereum", date: "2017-09-01", value: 386.61 },
        { name: "Ethereum", date: "2017-10-01", value: 303.56 },
        { name: "Ethereum", date: "2017-11-01", value: 298.21 },
    ];

    var options = {
        onmousemove(event, datapoint) {
            var svg = findClosest(event.target, "svg");
            var tooltip = svg.nextElementSibling;
            var date = new Date(datapoint.date).toUTCString().replace(/^.*?, (.*?) \d{2}:\d{2}:\d{2}.*?$/, "$1");

            tooltip.hidden = false;
            tooltip.textContent = `${date}: $${datapoint.value.toFixed(2)} USD`;
            tooltip.style.top = `${event.offsetY}px`;
            tooltip.style.left = `${event.offsetX + 20}px`;
        },

        onmouseout() {
            var svg = findClosest(event.target, "svg");
            var tooltip = svg.nextElementSibling;

            tooltip.hidden = true;
        },
    };

    sparkline.sparkline(document.querySelector(".btc"), btc, options);
    sparkline.sparkline(document.querySelector(".eth"), eth, options);

    function randNumbers() {
        var numbers = [];

        for (var i = 0; i < 20; i += 1) {
            numbers.push(Math.random() * 50);
        }

        return numbers;
    }

    function drawRandSparklines() {
        document.querySelectorAll(".sparkline").forEach(function (svg) {
            sparkline.sparkline(svg, randNumbers());
        });
    }

    drawRandSparklines();
    setInterval(drawRandSparklines, 3000);
});
