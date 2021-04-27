var comments = []
var loadingListener = null
var commentsLoadPending = 0

function statiqueHtmlEncode(value) {
    return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function statiqueMakePretty(value) {
    return value.replace(/\n/g, "<br />")
}

function statiqueUuidCreate() {
    var S4 = function() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}

function statiqueRefreshComments()
{
    comments = []
    var commentList = document.getElementById("statiqueCommentList")

    if((typeof(statiqueBaseUri) == "undefined") || (typeof(statiqueAuth) == "undefined"))
    {
        commentList.innerHTML = "Error: Statique is not configured correctly."
        return
    }

    commentList.innerHTML = "Loading Comments..."
    document.getElementById("statiqueCommentContent").value  =""

    var xhttp = new XMLHttpRequest()
    xhttp.onreadystatechange = statiqueListBlobs

    var pageTitle = window.location.pathname.replace(/\W/g,"_",)
    var url = statiqueBaseUri.replace(/\/$/, '') + "?comp=list&restype=container&prefix=" + pageTitle + "__" + "&" + statiqueAuth
    xhttp.open("GET", url, true)
    xhttp.send()
}

function statiqueListBlobs()
{
    if (this.readyState == 4 && this.status == 200) {

        blobsDocument = this.responseXML

        var blobnames = blobsDocument.getElementsByTagName("Name")
        commentsLoadPending = blobnames.length

        for(var i = 0; i < blobnames.length; i++)
        {
            var blobname = blobnames[i].innerHTML

            var xhttp = new XMLHttpRequest()
            xhttp.onreadystatechange = statiqueGetBlobContent

            var url = statiqueBaseUri.replace(/\/$/, '') + "/" + blobname + "?" + statiqueAuth
            xhttp.open("GET", url, true)
            xhttp.send()
        }

        if(blobnames.length == 0)
        {
            statiqueEnableComments()
            var commentList = document.getElementById("statiqueCommentList")
            commentList.innerHTML = "Nobody has commented yet."
        }
    }
}

function statiqueEnableComments()
{
    var username = localStorage.getItem('username');
    if(typeof(username) != "undefined")
    {
        document.getElementById("statiqueUsername").value = username;
    }
       
    document.getElementById("statiqueNewCommentDiv").style.display = "block";
    document.getElementById("statiqueCommentHeader").style.display = "none";
}

function statiqueGetBlobContent()
{
    if (this.readyState == 4 && this.status == 200) {
        var comment = JSON.parse(this.responseText)
        comments.push(comment)

        if(comments.length == commentsLoadPending)
        {
            comments.sort( function(a, b) { return  a.Date > b.Date ? 1: -1 })

            var commentList = document.getElementById("statiqueCommentList")
            commentList.innerHTML = ""

            for(var i = 0; i < comments.length; i++)
            {
                commentList.innerHTML = commentList.innerHTML +
                    "<div class=\"statiqueSingleComment\">" +
                        "<div class=\"statiqueCommentLabel\">From:</div>" + statiqueHtmlEncode(comments[i].Username) + "<br />" +
                        "<div class=\"statiqueCommentLabel\">Date:</div>" + statiqueHtmlEncode(new Date(comments[i].Date).toLocaleString()) + "<br />" +
                        "<div class=\"statiqueCommentLabel\">Comment:</div>" + statiqueMakePretty(statiqueHtmlEncode(comments[i].Comment)) +
                    "</div>"
            }

            statiqueEnableComments()
        }
    }
}

function statiqueNewComment()
{
    var username = localStorage.getItem('username');
    if(! username)
    {
        username = document.getElementById("statiqueUsername").value;
        if(! username)
        {
            alert("Please enter a username.")
            return
        }

        localStorage.setItem('username', username);
    }
    
    var comment = document.getElementById("statiqueCommentContent").value
    if(! comment)
    {
        return
    }

    var commentId = statiqueUuidCreate()

    var newComment = {
        "Username": username,
        "Date": new Date().toUTCString(),
        "Comment": comment,
        "CommentId": commentId
    }

    var commentJson = JSON.stringify(newComment)
    var pageTitle = window.location.pathname.replace(/\W/g,"_")
    var url = statiqueBaseUri.replace(/\/$/, '') + "/" + pageTitle + "__" + commentId + "__" + username.replace(/\W/g,"_") + "__" + ".json?" + statiqueAuth
    
    var xhttp = new XMLHttpRequest()
    xhttp.open("PUT", url, true)
    xhttp.setRequestHeader("Content-Type", "text/plain")
    xhttp.setRequestHeader("x-ms-blob-type", "BlockBlob")
    
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 201) {
            statiqueRefreshComments()
        }
    }

    xhttp.send(commentJson)
}

document.getElementById("statique").innerHTML = `
<div id="statiqueCommentHeader" style="display:block">
    <div id="statiqueSeeComments"><a href="javascript:statiqueRefreshComments()">Click to Load Comments</a></div>
</div>
<div class="statiqueCommentList" id="statiqueCommentList"></div>
<div class="statiqueNewCommentContainer" id="statiqueNewCommentDiv">
    <div class="statiqueNewCommentHeader">New Comment</div>
    <div id="statiqueFrom">
        <div class="statiqueCommentLabel">From:</div>
        <input type="text" textbox id="statiqueUsername" name="statiqueUsername" style="width:50%" />
    </div>
    <div class="statiqueComment" id="statiqueComment">
        <div class="statiqueCommentLabel">Comment:</div>
        <textarea id="statiqueCommentContent" name="statiqueCommentContent" rows="4" style="width:100%"></textarea>
    </div>
    <button id="statiqueNewComment" onClick="javascript:statiqueNewComment()">Post Comment</button>
</div>
`