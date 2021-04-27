<#
.SYNOPSIS
    Creates the JSON representation of comments in your WordPress export
    for the Statique static comment hosting system.
    When you run this command, it generates a .json file for each comment
    in your site. Once complete, use Azure Storage Explorer or similar to
    upload them to the 'comments' container of your Statique comments storage account.
#>
param(
    ## The path to your Wordpress export
    [Parameter(Mandatory)]
    $WordPressExportXmlPath
)

Add-Type -Assembly System.Web

$x = [xml] (Get-Content $WordPressExportXmlPath -raw)
foreach($post in ($x.rss.channel.item | ? { $_.post_type."#cdata-section" -eq 'post' })) {
    $commentBase = $post.link -replace '.*\d\d\d\d/\d\d/\d\d',''
    foreach($comment in $post.comment) {
        if($comment.comment_type."#cdata-section" -ne 'pingback') {
            $commentId = (New-Guid).ToString()
            $commentObject = [PSCustomObject] @{
                Username = $comment.comment_author."#cdata-section"
                Date = $comment.comment_date."#cdata-section" + " GMT"
                Comment = [System.Web.HttpUtility]::HtmlDecode($comment.comment_content."#cdata-section")
                CommentId = $commentId
            }
            
            $path = $commentBase -replace '\W',"_"

            $username = $commentObject.Username
            $username = $username -replace '\W',"_"
            
            $path = $path + "__" + $commentId + "__" + $username + "__.json"
            
            Set-Content $path -Value ($commentObject | ConvertTo-Json -Compress)
        }
    }
}
