document.addEventListener("DOMContentLoaded", async () => {
    const outputDiv = document.getElementById("output");
    const API_KEY = "AIzaSyBuTv3F6OMRj6mas74yCCWkmk4y6GC7l-8";
    const SENTIMENT_API_URL = 'http://localhost:5003/predict';

    chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
        const url = tabs[0].url;

        const youtubeRegex = /^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})/;
        const match = url.match(youtubeRegex);
        
        if (match && match[1]) {
            const videoId = match[1];
            outputDiv.textContent = `Youtube Video ID: ${videoId}\nFetching comments...`;
            
            const comments = await fetchComments(videoId, 100);
            if (comments.length === 0) {
                outputDiv.textContent += "\nNo comments found for this video.";
                return;
            }
            outputDiv.textContent += `\nFetched ${comments.length} comments. Sending for sentiment analysis...`;

            const predictions = await getSentimentPredictions(comments);
            

            if (predictions) {
                const sentimentCounts = {"positive":0, "negative":0, "neutral":0};
                predictions.forEach(prediction => {
                    sentimentCounts[prediction]++;
                });

                const total = predictions.length;
                const negativePercent = ((sentimentCounts["negative"] / total) * 100).toFixed(2);
                const positivePercent = ((sentimentCounts["positive"] / total) * 100).toFixed(2);
                const neutralPercent = ((sentimentCounts["neutral"] / total) * 100).toFixed(2);

                outputDiv.textContent += `\n\nSentiment Analysis Results: \nPositive: ${positivePercent}%\nNegative: ${negativePercent}%\nNeutral: ${neutralPercent}`;
            }
            for (let i = 0; i < Math.min(25, comments.length, predictions.length); i++) {
                const label = predictions[i]; // sentiment (positive, negative, neutral)
                const text = comments[i].replace(/\s+/g, ' ').trim(); // comment text
                outputDiv.textContent += `\n${i + 1}. [${label}] ${text}`;
                }

        } else {
            outputDiv.textContent = `This is not a valid Youtube URL`;
        }
    });

    async function fetchComments(videoId, targetCount) {
    let comments = [];
    let pageToken = "";
    try {
        while (comments.length < targetCount) {
            const maxResults = Math.min(100, targetCount - comments.length); 
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=${maxResults}${pageToken ? `&pageToken=${pageToken}` : ""}&key=${API_KEY}`
            );

            const data = await response.json();

            if (!data.items || data.items.length === 0) break;

            data.items.forEach(item => {
                const text = item?.snippet?.topLevelComment?.snippet?.textOriginal;
                if (text) comments.push(text);
            });

            pageToken = data.nextPageToken;
            if (!pageToken) break; 
        }
    } catch (error) {
        console.error('Error fetching comments:', error);
    }
    return comments;
}

    async function getSentimentPredictions(comments) {
        try {
            const response = await fetch(SENTIMENT_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({comments})
            });
            const result = await response.json();
            console.log(result);
            return result.sentiment;
        } catch (error) {
            console.error("Error fetching predictions:", error);
            outputDiv.textContent += "\nError fetching sentiment predictions.";
            return null;
        }
    }
});