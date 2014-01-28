function getDocHeight(doc) {
	var body = doc.body;
	var html = doc.documentElement;
	return Math.max(
		body.scrollHeight,
		body.offsetHeight,
		html.clientHeight,
		html.scrollHeight,
		html.offsetHeight
	);
}

function setIframeHeight(ifrm) {
	var doc = ifrm.contentDocument || ifrm.contentWindow.document;
	ifrm.style.visibility = 'hidden';
	ifrm.style.height = "10px"; // reset to minimal height ...
	// IE opt. for bing/msn needs a bit added or scrollbar appears
	ifrm.style.height = getDocHeight(doc) + 4 + "px";
	ifrm.style.visibility = 'visible';
}

function fixIframe(iframeWindow) {
	var iframes = document.getElementsByTagName('iframe');
	var i = 0, l = iframes.length;
	for (; i < l; i++) {
		if (iframes[i].contentWindow === iframeWindow) {
			setIframeHeight(iframes[i]);
		}
	}
}