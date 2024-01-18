// ==UserScript==
// @name         Graphite.dev PR UI Improvements
// @namespace    spencewenski
// @version      0.5
// @description  Improvements for the Graphite.dev PR UI
// @author       Spencer Ferris
// @match        https://*.graphite.dev/*
// @require      https://code.jquery.com/jquery-3.7.0.min.js
// @sandbox      JavaScript
// @downloadURL  https://github.com/spencewenski/greasemonkey-scripts/raw/main/graphite-dev-improvements.user.js
// @updateURL    https://github.com/spencewenski/greasemonkey-scripts/raw/main/graphite-dev-improvements.user.js
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
function loadSettings() {
    let oneSectionPerPr = localStorage.getItem("oneSectionPerPr");
    if (oneSectionPerPr === undefined) {
        oneSectionPerPr = true;
    }
    return {
        oneSectionPerPr: getFromLocalStorage("oneSectionPerPr", true),
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

function settingsCheckboxChangedEventListener(event) {
    toggleBooleanSetting(event.target.name, loadSettings());
    updateOldPrFilter();
}

function settingsDropdownChangedEventListener(event) {
    updateEnumSetting(event.target.name, event.target.value, loadSettings());
    updateOldPrFilter();
}

function buildSettingsUi(settings) {
    return `
<div id="${SettingsUiId}" style="margin-bottom: 1em; display: flex; flex-wrap: wrap; gap: 1em;">
    <div style="flex: 0 1 auto;">
        <input type="checkbox" ${settings.oneSectionPerPr ? "checked" : ""} id="oneSectionPerPr" name="oneSectionPerPr"/>
        <label for="oneSectionPerPr">One section per PR</label>
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
    let parent = $('[data-rbd-droppable-id="review-queue-sections"]');
    $(parent).prepend(buildSettingsUi(settings));
}
/// End - Settings UI ///

/// GitHub PR Link ///
function getPrDetails() {
    const matches = window.location.pathname.match(/.*\/pr\/(?<org>[a-zA-Z0-9-_]+)\/(?<repo>[a-zA-Z0-9-_]+)\/(?<prId>[a-zA-Z0-9-_]+)\/?.*/)
    return {
        org: matches?.groups?.org,
        repo: matches?.groups?.repo,
        prId: matches?.groups?.prId,
    };
}

const GitHubLinkElementId = "gmGitHubLink"
function addGitHubLink() {
    let githubLinkElement = $(`#${GitHubLinkElementId}`);
    if (!!githubLinkElement && githubLinkElement.length > 0) {
        // Element was already added
        return;
    }

    const prDetails = getPrDetails();
    if (!(prDetails?.org && prDetails?.repo && prDetails.prId)) {
        // Not on a PR page
        return;
    }

    githubLinkElement = `<a id="${GitHubLinkElementId}" href="https://github.com/${prDetails.org}/${prDetails.repo}/pull/${prDetails.prId}">(GitHub Link)</a>`;

    const siblingElement = $("*[class*='BranchName_branchName_body']");
    siblingElement.before(githubLinkElement)
}
/// End - GitHub PR Link ///

/// PR only in a single section ///
function hideDuplicatePrRows(settings) {
    if (!settings.oneSectionPerPr) {
        return;
    }
    const rows = $(".review-queue__section__table a");
    if (!rows || rows.length <= 0) {
        // No PRs found
        return;
    }
    const seen = [];
    rows.each((i, element) => {
        const href = $(element).attr("href");
        if (seen.indexOf(href) >= 0) {
            $(element).hide();
        } else {
            seen.push(href);
        }
    })
}
/// End - PR only in a single section ///

// In order to call a GM function from elements we insert, we need to add an event listener to the element.
function addEventListeners() {
    let element = document.getElementById('oneSectionPerPr');
    if (element) {
        element.addEventListener('change', settingsCheckboxChangedEventListener, false);
    }
}

function main() {
    let settings = loadSettings();
    addSettingsUI(settings);

    addGitHubLink();
    hideDuplicatePrRows(settings);

    addEventListeners();
}

// If the greasemonkey script loads before the PR UI loads, the script's UI won't be added.
// Observe the DOM for changes and re-run `main` when it changes to ensure the script loads.
function addMutationObserver() {
    // Select the node that will be observed for mutations
    const targetNode = document.getElementsByTagName('body')[0];

    // Options for the observer (which mutations to observe)
    const config = { childList: true, subtree: true };

    // Callback function to execute when mutations are observed
    const callback = (mutationList, observer) => {
      main();
    };

    // Create an observer instance linked to the callback function
    const observer = new MutationObserver(callback);

    // Start observing the target node for configured mutations
    observer.observe(targetNode, config);
}

$(() => {
    main();
    addMutationObserver();
});
