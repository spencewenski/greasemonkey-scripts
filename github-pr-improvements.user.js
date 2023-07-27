// ==UserScript==
// @name         GitHub PR Improvements
// @namespace    spencewenski
// @version      0.2
// @description  Improvements for the GitHub PR UI
// @author       Spencer Ferris
// @match        https://*.github.com/*/*/pulls?*
// @require      https://code.jquery.com/jquery-3.7.0.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js
// @grant        GM.setValue
// @grant        GM.getValue
// @downloadURL  https://github.com/spencewenski/greasemonkey-scripts/raw/main/github-pr-improvements.user.js
// @updateURL    https://github.com/spencewenski/greasemonkey-scripts/raw/main/github-pr-improvements.user.js
// ==/UserScript==

/// Utils ///
function getFromLocalStorage(key, defaultValue) {
    let value = JSON.parse(localStorage.getItem(key));
    return (value !== undefined && value != null)
        ? value
        : defaultValue;
}

function writeToLocalStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}
/// End - Utils ///

/// Settings ///
const OldPrThreshold = Object.freeze({
    Month: "Month",
    TwoWeeks: "TwoWeeks",
});

function loadSettings() {
    let hideOldPrs = localStorage.getItem("hideOldPrs");
    if (hideOldPrs === undefined) {
        hideOldPrs = true;
    }
    return {
        hideOldPrs: getFromLocalStorage("hideOldPrs", true),
        oldPrThreshold: getFromLocalStorage("oldPrThreshold", OldPrThreshold.Month),
    };
}

function toggleBooleanSetting(settingName, settings) {
    if (settings[settingName] === undefined) {
        throw new Error(`Unsupported setting name: ${settingName}`);
    }
    writeToLocalStorage(settingName, !settings[settingName]);
}

function updateEnumSetting(settingName, newValue, settings) {
    if (settings[settingName] === undefined) {
        throw new Error(`Unsupported setting name: ${settingName}`);
    }
    writeToLocalStorage(settingName, newValue);
}
/// End - Settings ///

/// Settings UI ///
const SettingsUiId = "gmSettingsUi";

function prQueryCheckboxChangedEventListener(event) {
    toggleBooleanSetting(event.target.name, loadSettings());
    updateOldPrFilter();
}

function prQueryDropdownChangedEventListener(event) {
    updateEnumSetting(event.target.name, event.target.value, loadSettings());
    updateOldPrFilter();
}

function buildSettingsUi(settings) {
    let thresholdOptions = Object.values(OldPrThreshold).map((value) => {
        return `<option value="${value}" ${settings.oldPrThreshold === value ? "selected" : ""}>${value}</option>`
    });

    return `
<div id="${SettingsUiId}" style="margin-bottom: 1em; display: flex; flex-wrap: wrap; gap: 1em;">
    <div style="flex: 0 1 auto;">
        <input type="checkbox" ${settings.hideOldPrs ? "checked" : ""} id="hideOldPrs" name="hideOldPrs"/>
        <label for="hideOldPrs">Hide Old PRs</label>
    </div>

    <div style="flex: 0 1 auto;">
        <select id="oldPrThreshold" name="oldPrThreshold">
        ${thresholdOptions}
        </select>
        <label for="oldPrThreshold">Max PR Age</label>
    </div>
</div>
`;
}

function addSettingsUI(settings) {
    let settingsElement = $(`#${SettingsUiId}`);
    if (!!settingsElement && settingsElement.length > 0) {
        // Element was already added
        return;
    }
    let parent = $("div[role=search]").parent();
    $(parent).parent().prepend(buildSettingsUi(settings));
}

/// End - Settings UI ///

/// Mange the old PR filter ///
const OldPrFilterRegex = new RegExp(/(?<prefix>updated:>=)(?<date>\d\d\d\d-\d\d-\d\d)/);

function getThresholdDate(settings) {
    const dateFormat = "YYYY-MM-DD";
    if (settings.oldPrThreshold === OldPrThreshold.Month) {
        return moment().subtract(30, "days").format(dateFormat);
    } else if (settings.oldPrThreshold === OldPrThreshold.TwoWeeks) {
        return moment().subtract(14, "days").format(dateFormat);
    } else {
        throw new Error(`Unsupported threshold: ${settings.oldPrThreshold}`);
    }
}

function removeOldPrFilter(settings) {
    let params = new URLSearchParams(window.location.search);
    let prQuery = params.get("q");
    let newQuery = prQuery.replace(OldPrFilterRegex, "");
    if (newQuery !== prQuery) {
        params.set("q", newQuery);
        window.location.search = params;
    }
}

function addOldPrFilter(settings) {
    let params = new URLSearchParams(window.location.search);
    let prQuery = params.get("q");
    let filterMatches = prQuery.match(OldPrFilterRegex);
    let newFilterDate = getThresholdDate(settings)
    let newFilter = `updated:>=${newFilterDate}`;

    let newQuery = prQuery;
    if (!filterMatches?.groups?.date) {
        // Filter not present, need to add it
        newQuery = prQuery.concat(" ", newFilter);
    } else if (filterMatches.groups.date !== newFilterDate) {
        // Filter already present, need to update it
        newQuery = prQuery.replace(OldPrFilterRegex, newFilter);
    }
    if (newQuery !== prQuery) {
        params.set("q", newQuery);
        window.location.search = params;
    }
}

function updateOldPrFilter(settings) {
    if (!settings) {
        settings = loadSettings();
    }
    if (settings.hideOldPrs) {
        addOldPrFilter(settings);
    } else {
        removeOldPrFilter(settings);
    }
}
/// End - Mange the old PR filter ///

// In order to call a GM function from elements we insert, we need to add an event listener to the element.
function addEventListeners() {
    document.getElementById('hideOldPrs').addEventListener('change', prQueryCheckboxChangedEventListener, false);
    document.getElementById('oldPrThreshold').addEventListener('change', prQueryDropdownChangedEventListener, false);
}

function main() {
    let settings = loadSettings();
    addSettingsUI(settings);
    updateOldPrFilter(settings);
    addEventListeners();
}

$(() => {
    main();
});
