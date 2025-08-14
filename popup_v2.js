document.addEventListener("DOMContentLoaded", async () => {
    const outputDiv = document.getElementById("output");


    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const url = tabs[0].url;


        const youtubeRegex = /^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})/;
        const match = url.match(youtubeRegex)
        
        if (match && match[1]) {
            const videoId = match[1];
            outputDiv.textContent = `Youtube Video ID: ${videoId}`;
        } else {
            outputDiv.textContent = `This is not a valid Youtube URL`;

        }

    });
});