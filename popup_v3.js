document.addEventListener("DOMContentLoaded", async () => {
    const outputDiv = document.getElementById("output");
    const API_KEY = "AIzaSyBuTv3F6OMRj6mas74yCCWkmk4y6GC7l-8"


    chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
        const url = tabs[0].url;


        const youtubeRegex = /^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})/;
        const match = url.match(youtubeRegex)
        
        if (match && match[1]) {
            const videoId = match[1];
            outputDiv.textContent = `Youtube Video ID: ${videoId}`;

            const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${API_KEY}`)
            const data = await response.json();

            if (data.items && data.items.length > 0) {
                const commentCount = data.items[0].statistics.commentCount;
                outputDiv.textContent += `\nTotal Comments: ${commentCount}`;
            } else {
                outputDiv.textContent += `\nNo data available for this video.`;
                
            } 
    }   else {
            outputDiv.textContent = `This is not a valid Youtube URL`;

        }   

    });
});