/**
 * Bubbly - Bootstrap 5 Dashboard & CMS Theme v. 1.3.2
 * Homepage:
 * Copyright 2023, Bootstrapious - https://bootstrapious.com
 */

"use strict";

document.addEventListener("DOMContentLoaded", function () {
    // ------------------------------------------------------- //
    // NoUI Slider Demos
    // ------------------------------------------------------- //

    var basicNoUISlider = document.getElementById("basicNoUISlider");
    if (basicNoUISlider) {
        noUiSlider.create(basicNoUISlider, {
            start: [20, 80],
            snap: false,
            connect: true,
            range: {
                min: [0],
                max: [100],
            },
        });
    }

    var stepNoUISlider = document.getElementById("stepNoUISlider");
    if (stepNoUISlider) {
        noUiSlider.create(stepNoUISlider, {
            start: [200, 1000],
            range: {
                min: [0],
                max: [1800],
            },
            step: 100,
            tooltips: true,
            connect: true,
        });
    }

    // ------------------------------------------------------- //
    // Datepicker Demos
    // ------------------------------------------------------- //

    const datepicker = new Datepicker(document.querySelector(".input-datepicker"), {
        buttonClass: "btn",
        format: "mm/dd/yyyy",
    });

    const datepickerAutoClose = new Datepicker(document.querySelector(".input-datepicker-autoclose"), {
        buttonClass: "btn",
        autohide: true,
    });

    const datepickerMultiple = new Datepicker(document.querySelector(".input-datepicker-multiple"), {
        buttonClass: "btn",
        maxNumberOfDates: 3,
    });

    const datepickerRange = new DateRangePicker(document.querySelector(".datepicker-range"), {
        buttonClass: "btn",
    });

    // ------------------------------------------------------- //
    // Choices.js Demos
    // ------------------------------------------------------- //

    const choices = new Choices(document.querySelector(".choices-1"), {
        placeholder: true,
        searchPlaceholderValue: "Search",
        itemSelectText: "Select",
    });

    const textRemove = new Choices(document.getElementById("choices-text-remove-button"), {
        delimiter: ",",
        editItems: true,
        maxItemCount: 5,
        removeItemButton: true,
    });

    const multipleChoices = new Choices("#choices-multiple", {
        removeItemButton: true,
    });

    // ------------------------------------------------------- //
    // imask Demos
    // ------------------------------------------------------- //

    var element = document.getElementById("isbn1");
    if (element) {
        var maskOptions = {
            mask: "000-00-000-0000-0",
        };
        var mask = IMask(element, maskOptions);
    }

    var element = document.getElementById("isbn2");
    if (element) {
        var maskOptions = {
            mask: "000 00 000 0000 0",
        };
        var mask = IMask(element, maskOptions);
    }

    var element = document.getElementById("isbn3");
    if (element) {
        var maskOptions = {
            mask: "000/00/000/0000/0",
        };
        var mask = IMask(element, maskOptions);
    }
    var element = document.getElementById("ip4");
    if (element) {
        var maskOptions = {
            mask: "000.000.000.000'",
        };
        var mask = IMask(element, maskOptions);
    }

    var element = document.getElementById("currency");
    if (element) {
        var maskOptions = {
            mask: "$ num",
            blocks: {
                num: {
                    // nested masks are available!
                    mask: Number,
                    thousandsSeparator: ",",
                    radix: ".",
                },
            },
        };
        var mask = IMask(element, maskOptions);
    }
    var element = document.getElementById("date");
    if (element) {
        var maskOptions = {
            mask: Date, // enable date mask

            // other options are optional
            pattern: "Y-m-d", // Pattern mask with defined blocks, default is 'd{.}`m{.}`Y'
            // you can provide your own blocks definitions, default blocks for date mask are:
            blocks: {
                d: {
                    mask: IMask.MaskedRange,
                    from: 1,
                    to: 31,
                    maxLength: 2,
                },
                m: {
                    mask: IMask.MaskedRange,
                    from: 1,
                    to: 12,
                    maxLength: 2,
                },
                Y: {
                    mask: IMask.MaskedRange,
                    from: 1900,
                    to: 9999,
                },
            },
            // define date -> str convertion
            format: function (date) {
                var day = date.getDate();
                var month = date.getMonth() + 1;
                var year = date.getFullYear();

                if (day < 10) day = "0" + day;
                if (month < 10) month = "0" + month;

                return [year, month, day].join("-");
            },
            // define str -> date convertion
            parse: function (str) {
                var yearMonthDay = str.split("-");
                return new Date(yearMonthDay[0], yearMonthDay[1] - 1, yearMonthDay[2]);
            },
        };
        var mask = IMask(element, maskOptions);
    }

    var element = document.getElementById("phone");
    if (element) {
        var maskOptions = {
            mask: "+{1}-000-000-0000",
        };
        var mask = IMask(element, maskOptions);
    }

    var element = document.getElementById("taxId");
    if (element) {
        var maskOptions = {
            mask: "00-000000",
        };
        var mask = IMask(element, maskOptions);
    }
});
