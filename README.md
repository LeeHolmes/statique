# Statique - Simple Self-Hosted Comments for Static Websites

![image](https://user-images.githubusercontent.com/11475352/116257432-e6f0c000-a728-11eb-8948-d0c09e2f3b41.png)

When hosting a static website or blog, you ultimately have to tackle the question: _"What about the comments?"_

Some popular options are:

- **Disqus**. Simple and popular, but has increasingly moved towards ad-supported and privacy invasive practices.
- **[StaticMan](https://staticman.net/)**. An open source NodeJS implementation that can render comments directly into your static website.
- **[Utteranc.es](https://utteranc.es/)**. An open source commenting system built on top of GitHub issues. Requires commentors to have Github accounts.
- **Discourse**, **TalkYard**, **Remark**, **Commento**, *...*. Open source, self-hosted commenting platforms that you set up as either a Docker image, or Linux server that you manage. Some also offer hosted plans for around $20/mo.

Statique takes a radically different approach by hosting comments directly in an Azure Storage account that you configure and provide. This gives you global, serverless, world-class reliability. For a popular website with a couple of thousand comments, should cost around $0.03 per month.

For a demo, see the [Statique Sample Comment Site](https://www.leeholmes.com/projects/statique/).

## Features

- Lightweight. Statique only requires about 3kb of fully cacheable Javascript and CSS.
- Lazy Loading. Statique only loads comments when the user requests them, resulting in lightning-fast page loads.
- No registration required. Statique asks that users give themselves a nickname, but otherwise does not require any registration or user management.

## Non-Features

- User accounts. It is trivial to create throwaway / anonymous accounts with all popular login providers (Gmail, Facebook, Twitter, Microsoft Account), so Statique does not require them.
- Moderation. Removing spammy or throwaway comments currently requires that you delete the comments from your Azure Storage account directly. You can write automation for this if it becomes an issue.

# Getting Started

To host your comments with Statique:

## Host the CSS and JS

Place statique.js and statique.css in one of your assets directories.

## Embed the hosting code

Add the following code to the `<head>` of your site:

``` html
    <link rel="stylesheet" href="statique.css" type="text/css">
    <script type="text/javascript">
       var statiqueAuth = '<your auth string>'
       var statiqueBaseUri = 'https://<your comment storage account>.blob.core.windows.net/comments'
    </script>
```

And add add the following DIV where you want your comments hosted:

``` html
    <div id="statique">
        <script defer="" src="statique.js"></script>
        <noscript>Please enable JavaScript to load the comments.</noscript>
    </div>
```

### statiqueAuth parameter

The `statiqueAuth` parameter is an auth string you generate for your Azure Storage account that gives commenters the ability to list, read, and add comments. It does not give them permission to delete comments. See below for how to configure your Storage account.

### statiqueBaseUri

The `statiqueBaseUri` parameter is the URL for the 'comments' container in your Azure Storage account - for example, `https://statiquecomments.blob.core.windows.net/comments`. See below for how to configure your Storage account.

## Create and Configure your Azure Storage Account

Use [Azure Cloud Shell](https://docs.microsoft.com/en-us/azure/cloud-shell/overview) to create the Storage Account and required Statique auth parameter.

Once you've opened Azure Cloud Shell, run the following script. Be sure to pick a custom / unique name in Step 2 when you call New-AzStorageAccount.

``` powershell
## Create a Resource Group for your comments. You can pick a name other than 'statique' if you want.
New-AzResourceGroup -Name statique -Location EastUS

## Create a new Azure Storage account. Replace 'statiquecomments' with a unique Azure Storage account name of your choosing.
## If you pick 'statiquecomments' as your storage account name, your statiqueBaseUri will be:
## https://statiquecomments.blob.core.windows.net/comments
$storageAccount = New-AzStorageAccount -Name statiquecomments -ResourceGroup statique -SkuName Standard_LRS -Location EastUS -AllowBlobPublicAccess:$true

## Create a CORS rule to allow your site to communicate with this Storage account. Replace 'https://www.leeholmes.com' with your site.
## If you want to experiment with Statique (i.e.: with local files), you can set "*" as AllowedOrigins.
$storageAccount | Set-AzStorageCORSRule -ServiceType Blob -CorsRules @{ AllowedOrigins = "https://www.leeholmes.com"; AllowedMethods = "GET","PUT"; AllowedHeaders = "*" }

## Create the container that will hold your comments
$container = $storageAccount | New-AzStorageContainer -Name comments -Permission Container

## Generate the statiqueAuth parameter. This will generate a string like:
## ?sv=2019-07-07&sr=c&sig=pI0YWToYGa9nfSIgRQA%3D&spr=https&se=2099-01-01T00%3A00%3A00Z&sp=rcl
## Your statiqueAuth parameter is everything after the question mark:
## sv=2019-07-07&sr=c&sig=pI0YWToYGa9nfSIgRQA%3D&spr=https&se=2099-01-01T00%3A00%3A00Z&sp=rcl
$container | New-AzStorageContainerSASToken -Permission "rcl" -Protocol "httpsonly" -ExpiryTime "1/1/2099"
```

## Importing Comments

Statique uses your page's URL to filter comments.

For this page:

`https://www.leeholmes.com/statique-simple-self-hosted-comments-for-static-websites/`

The base comment URL in your Azure Storage container will be (URL has all non-word characters replaced by "`_`"):

`_statique_simple_self_hosted_comments_for_static_websites_`

Then, Statique adds a GUID and comment author, separated by two underscores (comment author has all non-word characters replaced by "`_`"):

`_statique_simple_self_hosted_comments_for_static_websites___3c1265e8-f9f8-4ccb-2280-39442834f026__Lee_Holmes__.json`

The content of this blob itself is a simple JSON object of Username, Date, Comment, and CommentId:

``` json
{"Username":"Lee Holmes","Date":"Tue, 27 Apr 2021 14:18:39 GMT","Comment":"Wow, this was easy!","CommentId":"cf468c27-b3ba-a39b-27cf-f36297bfa3b9"}
```

If you want to import comments from another platform, you can see a PowerShell script that does this for WordPress. This will generate a directory full of .json files based on a WordPress blog export, which you can then use Azure Storage Explorer to upload:

[WordPress Importer](https://github.com/LeeHolmes/statique/blob/main/misc/Import-WordpressComment.ps1)
