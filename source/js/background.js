Array.prototype.equals = function (array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time 
    if (this.length != array.length)
        return false;

    for (var i = 0, l=this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;       
        }           
        else if (this[i] != array[i]) { 
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;   
        }           
    }       
    return true;
}

var DefaultSettings = {
	"timestamp": "absolute",
	"full_after_24h": false,
	"name_display": "both",
	"typeahead_display_username_only": true,
	"circled_avatars": true,
	"no_columns_icons": true,
	"yt_rm_button": true,
	"small_icons_compose": true,
	"grayscale_notification_icons": false,
	"url_redirection": true,
	"blurred_modals": true,
	"only_one_thumbnails": true,
	"minimal_mode": true,
	"flash_tweets": "mentions",
	"providers": {
		"500px": true,
		"bandcamp": true,
		"cloudapp": true,
		"dailymotion": true,
		"deviantart": true,
		"dribbble": true,
		"droplr": true,
		"flickr": true,
		"imgly": true,
		"imgur": true,
		"instagram": true,
		"mobyto": true,
		"soundcloud": true,
		"ted": true,
		"toresize": true,
		"tumblr": true,
		"vimeo": true,
		"yfrog": true,
	}
};

var currentOptions;

chrome.storage.sync.get("BTDSettings", function(obj) {
	if (obj.BTDSettings !== undefined) {
		currentOptions = obj.BTDSettings;
		var reApply = false;

		for (var setting in DefaultSettings) {
			if (currentOptions[setting] == undefined) {
				console.debug("Defining",setting,"to default value", DefaultSettings[setting]);
				currentOptions[setting] = DefaultSettings[setting];
				reApply = true;
			}
		}

		for (var provider in DefaultSettings["providers"]) {
			if (currentOptions["providers"][provider] == undefined) {
				console.log("Adding", provider, "as a new provider with value", DefaultSettings["providers"][provider]);
				currentOptions["providers"][provider] = DefaultSettings["providers"][provider];
				reApply = true;
			}
		}

		for (var setting in currentOptions) {
			if (DefaultSettings[setting] == undefined) {
				console.log("Deleting",setting);
				delete currentOptions[setting];
				reApply = true;
			}
		}

		for (var setting in currentOptions["providers"]) {
			if (DefaultSettings["providers"][setting] == undefined) {
				delete currentOptions["providers"][setting];
				reApply = true;
			}
		}

		if (reApply === true) {
			chrome.storage.sync.set({"BTDSettings": currentOptions}, function() {
				console.log("Options updated!");
				console.log(currentOptions);
			});
		}
	} else {
		chrome.storage.sync.set({"BTDSettings": DefaultSettings}, function() {
			console.log("Default options set");
		})
	}

	
});

const TWEETDECK_WEB_URL = 'https://tweetdeck.twitter.com';

/**
 * Step 2: Collate a list of all the open tabs.
 */
function gatherTabs(urls, itemInfos) {
	var allTheTabs = [];
	var windowsChecked = 0;

	// First get all the windows...
	chrome.windows.getAll(function(windows) {
		for (var i = 0; i < windows.length; i++) {
			// ... and then all their tabs.
			chrome.tabs.getAllInWindow(windows[i].id, function(tabs) {
				windowsChecked++;
				allTheTabs = allTheTabs.concat(tabs);

				if (windowsChecked === windows.length) {
					// We have all the tabs! Search for a TweetDeck...
					openApp(urls, allTheTabs, itemInfos);
				}
			});

		}
	});
}

function openApp(urls, tabs, itemInfos) {
	// Search urls in priority order...
	for (var i = 0; i < urls.length; i++) {
		var url = urls[i];

		// Search tabs...
		for (var j = 0; j < tabs.length; j++) {
			var tab = tabs[j];
			if (tab.url.indexOf(url) === 0) {
				// Found it!
				var tabId = tab.id;
				chrome.windows.update(tab.windowId, {
					focused: true
				});
				chrome.tabs.update(tabId, {
					selected: true,
					active: true,
					highlighted: true
				}, function() {
					var text = itemInfos.text;
					var url = itemInfos.url;
					chrome.tabs.sendMessage(tabId, {
						text: text,
						url: url
					})
				});
				return;
			}
		}
	}

	// Didn't find it! Open a new one!
	chrome.tabs.create({
		url: urls[0]
	}, function(tab) {

		chrome.tabs.onUpdated.addListener(function(tabId, info) {
			if (info.status == "complete") {
				chrome.tabs.sendMessage(tabId, {
					text: itemInfos.text,
					url: itemInfos.url
				});
			}
		})
	});
};

var clickHandler = function(info, tab) {
	var text;
	var url;

	if (info.selectionText) {
		text = "\"" + info.selectionText.substr(0, 110) + "\"";
	} else {
		text = tab.title.substr(0, 110);
	}

	if (info.linkUrl) {
		url = info.linkUrl
	} else {
		url = info.pageUrl;
	}

	if (info.mediaType === "image") {
		url = info.srcUrl;
		text = "";
	}

	gatherTabs([TWEETDECK_WEB_URL], {
		"text": text,
		"url": url
	});
};

chrome.contextMenus.create({
	"title": "Share on (Better) TweetDeck",
	"contexts": ["page", "selection", "image", "link"],
	"onclick": clickHandler
});