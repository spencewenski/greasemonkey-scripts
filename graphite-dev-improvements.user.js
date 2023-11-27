// ==UserScript==
// @name         Graphite.dev PR UI Improvements
// @namespace    spencewenski
// @version      0.2
// @description  Improvements for the Graphite.dev PR UI
// @author       Spencer Ferris
// @match        https://*.graphite.dev/*
// @require      https://code.jquery.com/jquery-3.7.0.min.js
// @sandbox      JavaScript
// @downloadURL  https://github.com/spencewenski/greasemonkey-scripts/raw/main/graphite-dev-improvements.user.js
// @updateURL    https://github.com/spencewenski/greasemonkey-scripts/raw/main/graphite-dev-improvements.user.js
// ==/UserScript==

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

    const siblingElement = $("*[class*='PullRequestInfo_branchName']");
    siblingElement.before(githubLinkElement)
}
/// End - GitHub PR Link ///

function main() {
    addGitHubLink();
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
