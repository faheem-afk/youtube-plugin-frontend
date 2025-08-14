document.addEventListener("DOMContentLoaded", async () => {
    const API_KEY = "";
    const SENTIMENT_API_URL = 'http://localhost:5001/predict';

    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const url = tabs[0].url;
        const youtubeRegex = /^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})/;
        const match = url.match(youtubeRegex);

        if (match && match[1]) {
            const videoId = match[1];
            const total_comments = await getTotalComments(videoId, API_KEY);
            setVideoId(videoId);
            setStatus("Fetching comments...");

            const {comments, unique_count, avgLength} = await fetchComments(videoId, total_comments);
            if (comments.length === 0) {
                setStatus("No comments found for this video.");
                return;
            }
            setStatus(`Sending for sentiment analysis...`);

            result = await getSentimentPredictions(comments);
            
            const sectionHeading_pie = document.querySelectorAll("h2.section")[1];
            const pieImg = document.createElement("img");
            pieImg.id = "pie";
            pieImg.alt = "Sentiment pie";
            pieImg.style.width = "100%";
            pieImg.style.maxWidth = "100%";
            pieImg.style.borderRadius = "12px";
            sectionHeading_pie.insertAdjacentElement("afterend", pieImg);
            const pie_url = result.pie_url;
            document.getElementById("pie").src = pie_url; 


            const sectionHeading_cloud = document.querySelectorAll("h2.section")[2];
            const wordCloudImg = document.createElement("img");
            wordCloudImg.id = "cloud";
            wordCloudImg.alt = "Word cloud";
            wordCloudImg.style.width = "100%";
            wordCloudImg.style.maxWidth = "360px";
            wordCloudImg.style.borderRadius = "12px";
            wordCloudImg.style.display = "block";
            wordCloudImg.style.margin = "20px auto"; 
            sectionHeading_cloud.insertAdjacentElement("afterend", wordCloudImg);
            const cloud_url = result.word_cloud_url;
            document.getElementById("cloud").src = cloud_url; 
            
            
            const sectionHeading_timeSeries = document.querySelectorAll("h2.section")[3];
            const timeSeriesImg = document.createElement("img");
            timeSeriesImg.id = "timeSeries";
            timeSeriesImg.alt = "Time Series";
            timeSeriesImg.style.width = "100%";
            timeSeriesImg.style.maxWidth = "360px";
            timeSeriesImg.style.borderRadius = "12px";
            timeSeriesImg.style.display = "block";
            timeSeriesImg.style.margin = "20px auto"; 
            sectionHeading_timeSeries.insertAdjacentElement("afterend", timeSeriesImg);
            const timeSeries_url = result.time_series_url;
            document.getElementById("timeSeries").src = timeSeries_url; 


            document.getElementById("Total").textContent = total_comments;
            document.getElementById('Unique').textContent = unique_count;
            document.getElementById('AvgLength').textContent = avgLength;
            document.getElementById('AvgSentiment').textContent = (await avgSentimentScore(result.sentiments)).toFixed(2);
            renderTop25(result.texts, result.sentiments);
            setStatus("Done.");

        }
    });


    async function avgSentimentScore(predictions) {
        const label = { 'positive': 1, 'neutral': 0, 'negative': -1 };
        const int_values = predictions.map(item => label[item]);
        const avg = int_values.reduce((sum, val) => sum + val, 0) / int_values.length;
        return avg * 10; // returns a number between -1 and 1
    }


    async function fetchComments(videoId, targetCount) {
        let comments = [];
        const uniqueAuthors = new Set();
        let text_length = 0;
        let commentsFetched = 0;
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
                    const authorId = item.snippet.topLevelComment.snippet.authorChannelId?.value;
                    if (authorId) uniqueAuthors.add(authorId);
                    
                    const text = item.snippet.topLevelComment.snippet.textOriginal;
                    if (text) {
                        const wordCount = text.trim().split(/\s+/).length;
                        text_length += wordCount;
                        commentsFetched++;
                    }
                    
                    const commentSnippet = item.snippet.topLevelComment.snippet;
                    comments.push({
                    text: commentSnippet.textOriginal,
                    timestamp: commentSnippet.publishedAt
                    });
                });
                
                pageToken = data.nextPageToken;
                if (!pageToken) break;
            }

        } catch (error) {
            console.error('Error fetching comments:', error);
        }
        const avgLength = text_length / commentsFetched;
        
        return {comments: comments.slice(0, 500), 
                unique_count: uniqueAuthors.size,
                avgLength: avgLength.toFixed(2)};
    }

    async function getSentimentPredictions(comments) {
        try {
            const response = await fetch(SENTIMENT_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ comments })
            });
            const result = await response.json();
            return result
       }catch (error) {
            console.error("Error fetching predictions:", error);
            setStatus("Error fetching sentiment predictions.");
            return null;
        }
    }

    // ----- UI Helper Functions -----
    function setVideoId(id) {
        document.getElementById("videoId").textContent = id;
    }
    function setStatus(text) {
        document.getElementById("status").textContent = text;
    }

    async function getTotalComments(videoId, apiKey) {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        const item = data.items?.[0];
        return item ? Number(item.statistics.commentCount) : 0;
}


    function renderTop25(comments, predictions) {
        const list = document.getElementById("list");
        list.innerHTML = "";
        const n = Math.min(25, comments.length, predictions.length);
        for (let i = 0; i < n; i++) {
            const item = document.createElement("div");
            item.className = "item";

            const head = document.createElement("div");
            head.className = "item-head";

            const idx = document.createElement("div");
            idx.className = "idx";
            idx.textContent = `${i + 1}.`;

            const badge = document.createElement("div");
            const label = predictions[i];
            const cls = label === "positive" ? "pos" : label === "negative" ? "neg" : "neu";
            badge.className = `badge ${cls}`;
            badge.textContent = label.toUpperCase();

            head.append(idx, badge);

            const body = document.createElement("div");
            body.className = "item-body";
            body.textContent = comments[i].replace(/\s+/g, ' ').trim();

            item.append(head, body);
            list.appendChild(item);
        }
    }
});
