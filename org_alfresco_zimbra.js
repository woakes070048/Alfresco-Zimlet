/* Alfresco Integration zimlet object */

// Constants for web script services

var ALF_WS_URL_PREFIX   = "/alfresco/service";

var ALF_WCWS_URL_PREFIX = "/alfresco/wcservice";

var ALF_LOGIN_SERVICE_URL  = ALF_WS_URL_PREFIX + "/api/login";

var ALF_TICKET_SERVICE_URL = ALF_WS_URL_PREFIX + "/api/login/ticket/";

// Other constants used by this program

var ALFRESCO_BUSYIMGURL = "img/animated/Imgwait_32.gif";

function Org_Alfresco_Zimbra()
{
	this.ticket = null;
	
    /* data members related to alfresco document management
     */

    /* view state management (for attach files dialog) */
    this.viewstate_div = null;          /* view state (document selection, pagination, etc) */

    /* (attachment state) variables */
    this.attach_current = -1;           // current document being attached
    this.attach_documents = [];         // list of documents to be attached
    	
}

Org_Alfresco_Zimbra.prototype = new ZmZimletBase();

Org_Alfresco_Zimbra.prototype.constructor = Org_Alfresco_Zimbra;

// initializer function (automatically called by zimlet framework)
Org_Alfresco_Zimbra.prototype.init = function()
{
   this.addAttachmentHandler ();

    // assign self to window object because we need to execute some code in window context
    window.Alfresco_widget = this;
    
    //YAHOO.util.Get.css("http://yui.yahooapis.com/2.5.2/build/autocomplete/assets/skins/sam/autocomplete.css");
        
};

// return the address of alfresco server.
Org_Alfresco_Zimbra.prototype.getAlfUrl = function()
{
    if ( this.alfurl != null ) {
    
    	return this.alfurl;
    	
    } else { 	
    
    	var alfurl = this.getUserProperty("alfurl");	
		if(!alfurl)
			alfurl = this._zimletContext.getConfig("alfurl");
		
		this.alfurl = alfurl;
		
		return this.alfurl;
	}	
    
}


/* Utility functions for debugging */
Org_Alfresco_Zimbra.prototype.debug = function(msg) {
    DBG.println ("[alfhw] " + msg);
}

Org_Alfresco_Zimbra.prototype.info = function(msg) {
    this.displayStatusMessage (msg);
    this.debug (msg);
}

// handler for menu items that do not have <actionURL> 
// (see xml file for details on the menu items)
Org_Alfresco_Zimbra.prototype.menuItemSelected = function(itemId)
{
	switch (itemId) {
		case "AboutAlfresco":
			this.displayAboutAlfrescoZimlet();
		break;
		case "PREFERENCES":
			this.createPropertyEditor();
		break;

	}
}

// display basic information about the alfresco server. It can also serve as a test of 
// the connection to the alfresco server.
Org_Alfresco_Zimbra.prototype.displayAboutAlfrescoZimlet = function()
{
    var view = new DwtComposite (this.getShell());
    var args = {title: "About Alfresco", view: view};
    var dlg = this._createDialog (args);
    
    var alfTicket =  this.getTicket() ;
    
    if ( alfTicket == null ) {
    
    	view.getHtmlElement().innerHTML = "Failed to Connect to Alfresco !";
   
   	} else {
   
		var alfurl = this.getAlfUrl();	

		var alfAboutWSUrl = ["http://",alfurl,ALF_WCWS_URL_PREFIX,"/zimbra/about","?ticket=",alfTicket].join("");

		var hwUrl = ZmZimletBase.PROXY + AjxStringUtil.urlComponentEncode(alfAboutWSUrl);

		var hwResult = AjxRpc.invoke(null, hwUrl, null, null,true);

		var myObject = eval('(' + hwResult.text + ')');
		
		var info  ="<table>";
		    info +="<tr><td><b>Alfresco Server</b></td><td>"+alfurl +"</td></tr>";
		    info +="<tr><td><b>Server Version</b></td><td>"+myObject.version +"</td></tr>";
		    info +="<tr><td><b>Server Edition</b></td><td>"+myObject.edition +"</td></tr>";
		    info +="<tr><td><b>User Id</b></td><td>"+myObject.userId +"</td></tr>";
		    info +="<tr><td><b>User Name</b></td><td>"+myObject.fullName +"</td></tr>";
			info +="</table>";
		
		view.getHtmlElement().innerHTML = info;
   
	}
	
    dlg.setButtonListener (DwtDialog.OK_BUTTON, new AjxListener(this,function() { dlg.popdown(); dlg.dispose(); }));
    dlg.setButtonListener (DwtDialog.CANCEL_BUTTON, new AjxListener(this,function() { dlg.popdown(); dlg.dispose(); }));
    dlg.popup();
}

// retrieve alfresco ticket for webscript service calls.
Org_Alfresco_Zimbra.prototype.getTicket = function(){

	// Check if we already have the ticket
	//this.ticket = $.cookie('ticket');

	if ( this.ticket == null ) {
	
		this.ticket = this.login();
	
	} else {

		// If yes, validate the ticket
		
		if ( ! this.validateTicket() ) {
	
			this.ticket = this.login();
			
		} 
		
	}
	
	return this.ticket;
		
}

// validate the ticket. If it expires, try to renew it.
Org_Alfresco_Zimbra.prototype.validateTicket = function(){
	
	var alfurl = this.getUserProperty("alfurl");	
	if(!alfurl)
		alfurl = this._zimletContext.getConfig("alfurl");	

	var password = this.getUserProperty("password");
	if(!password)
		password = this._zimletContext.getConfig("password");
			
	var user = this.getUserProperty("user");	
	if(!user)
		user = this._zimletContext.getConfig("user");	

	if ( this.ticket == null ) {
	
		return false ;
		
	} else {
	
		var validationUrl = ["http://",alfurl,ALF_TICKET_SERVICE_URL,this.ticket].join("");

		var proxyUrl = ZmZimletBase.PROXY + AjxStringUtil.urlComponentEncode(validationUrl)+"&user="+user+"&pass="+password+"&auth=basic";

		var result = AjxRpc.invoke(null, proxyUrl, null, null,true);

		if ( result.success ) {

			var xmlDoc = AjxXmlDoc.createFromXml(result.text);

			var firstNode = xmlDoc._doc.firstChild;

			if ( firstNode.tagName == "ticket" ) {

				return true;

			} else {

				return false;

			}

		} else {

			return false;

		}
			
	}


}

Org_Alfresco_Zimbra.prototype.login = function(){
var password = this.getUserProperty("password");
	
	if(!password)
		password = this._zimletContext.getConfig("password");
			
	var user = this.getUserProperty("user");	
	if(!user)
		user = this._zimletContext.getConfig("user");	

	var alfurl = this.getAlfUrl();
	

	var alfLoginUrl = ["http://",alfurl,ALF_LOGIN_SERVICE_URL,"?u=",user,"&pw=",password].join("");
			
	var proxyUrl = ZmZimletBase.PROXY + AjxStringUtil.urlComponentEncode(alfLoginUrl);
	
    var result = AjxRpc.invoke(null, proxyUrl, null, null,true);
    
    if ( result.success ) {


    
    	var xmlDoc = AjxXmlDoc.createFromXml(result.text);
    	
    	//var firstNode = xmlDoc._doc.firstChild;
    	
    	var firstNode = AjxEnv.isIE? xmlDoc._doc.childNodes[1] : xmlDoc._doc.childNodes[0];
    	
    	if ( firstNode.tagName == "ticket" ) {
    	
    		return firstNode.firstChild.nodeValue;
    	
    	} else {
    	
    		return null;
        
    	}
    	
    } else {
    
    	return null;
    	
    }
	
}

// add the alfreco document selection dialog box to the attach files page
Org_Alfresco_Zimbra.prototype.addAlfrescoTabToAttachDialog = function()
{
	var alfTicket = this.getTicket();

	var alfurl = this.getAlfUrl();	

    var attachdlg = this._attachdlg = appCtxt.getAttachDialog ();
    var tabview = attachdlg ? attachdlg.getTabView () : null;
    this.ATV = new AlfrescoTabView (tabview, this , alfurl, alfTicket);
    
    var tabkey = attachdlg.addTab ("alfresco", "Alfresco Documents", this.ATV);

    var callback = new AjxCallback (this, this.onAttachDocuments);
    attachdlg.addOkListener (tabkey, callback);

    
}

// (event handler) called when alfresco documents are selected for attachment
Org_Alfresco_Zimbra.prototype.onCheckDocuments = function(type, args)
{
    //Populate the list of selected alfresco documents
    var isDocument = type.data.isDocument;
    var name = type.data.label;
    var src = "http://"+args.alfurl+type.data.src;
    

}

Org_Alfresco_Zimbra.prototype.isInline = function()
{
    return this._attachdlg.isInline();
}

// (event handler) called when alfresco documents are selected for attachment
Org_Alfresco_Zimbra.prototype.onAttachDocuments = function()
{
    this.attach_documents = this.getSelectedDocuments();
    this.attach_current = -1;
    this.attachment_ids = [];

    this.ATV.showAttachingDocuments ();      /* display progress */
    var callback = new AjxCallback (this, this.doneAttachDocuments);
    this.attachDocument(callback);
}

/* get all <img> nodes selected for attachment */
Org_Alfresco_Zimbra.prototype.getSelectedDocuments = function()
{
    var documents = [];
  
    
	var nodes = this.ATV.getCheckNodes();
	
	if (nodes != null) {
	
		var counter = 0;
		
		for ( var i = 0 ; i < nodes.length ; i ++ ) {
		
			if ( nodes[i].data.isDocument ) {
			
				var document = {};
			
				document.src = "http://"+this.getAlfUrl()+nodes[i].data.src+"?ticket="+this.getTicket();
			
				document.name = nodes[i].data.label;
				
				document.path = nodes[i].data.path;
				
				document.dlink = "http://"+this.getAlfUrl()+nodes[i].data.dlink;

				document.shortlink = "http://"+this.getAlfUrl()+nodes[i].data.shortlink;
			
				documents[counter] = document;
				
				counter ++;
				
			}	
		
		}
	
	}
    
    return documents;
}

/* deselect all documents (= <img> nodes) from all sets that were previously selected for attachment */
Org_Alfresco_Zimbra.prototype.deselectAllDocuments = function()
{
    //var sets = this.getDocumentsets();
    //for (var s=0; s<sets.length; s++) {
    //    sets[s].deselectAllDocuments();
    //}
}

/* Invoked (as a callback) when all images have been uploaded to the server
   Now just attach the images to the composer window
 */
Org_Alfresco_Zimbra.prototype.doneAttachDocuments = function ()
{
    // locate the composer control and set up the callback handler
    var composer = appCtxt.getApp(ZmApp.MAIL).getComposeController();
    var callback = new AjxCallback (this,composer._handleResponseSaveDraftListener);

    // build up the attachment list 
    attachment_list = this.attachment_ids.join(",");
    composer.sendMsg(attachment_list,ZmComposeController.DRAFT_TYPE_MANUAL,callback);

    // and clean up all the documentsets
    this.deselectAllDocuments();

    // also clear up the attach view
    this.attach_documents = [];
    this.attach_current = -1;
    this.attachment_ids = [];
}

// upload a document to the zimbra file-upload servlet
Org_Alfresco_Zimbra.prototype.attachDocument = function (callback)
{
    var i = this.attach_current;
    var l = this.attach_documents.length;
    if (i == (l-1)) {
        // we have finished attaching all documents
        this.debug ("Attached " + l + " Alfresco documents");
        callback.run ();
    }
    else
    {
        i = i+1; // starts at -1, so ++ for 0-based index
        var doc = this.attach_documents[i];
        var src = doc.src;
        var filename = doc.name;

        var params = ["upload=1","&","fmt=raw","&","filename=",filename].join("");
        var server_url = 
            ZmZimletBase.PROXY + 
            AjxStringUtil.urlComponentEncode (src) + 
            "&" + params;
        var cb = new AjxCallback (this,this.doneAttachDocument, [callback]);
        AjxRpc.invoke (params, server_url, null, cb, true);
    }
}

// invoked as a callback when a single document has been attached
Org_Alfresco_Zimbra.prototype.doneAttachDocument = function (callback, result)
{
    var re = new RegExp("'([^']+)'", "m");
    var re_id = new RegExp ("^[0-9a-f:-]+$","im");

    this.attach_current = this.attach_current + 1;
    this.debug ("<xmp>" + result.text + "</xmp>");

    if (!result.text) {
    } else {
        this.ATV.showAttachProgress ();
        // result.text is some html code with embedded strings inside ''
        var s = result.text;
        for (var i=s.search(re); (i!=-1) && (s.length>0); i=s.search(re)) {
            var m = re.exec (s);
            if (!m) { break; }
            if (m[1].match(re_id)) { this.attachment_ids.push (m[1]); }
            s = s.substring(i+m[0].length);
        }
    }

    this.attachDocument (callback);
}

/* For uploading attachments to alfresco */
Org_Alfresco_Zimbra.prototype.addAttachmentHandler = function()
{
     this._msgController = AjxDispatcher.run("GetMsgController");
     var viewType = appCtxt.getViewTypeFromId(ZmId.VIEW_MSG);
     this._msgController._initializeView(viewType);
 
     // apply this option to all attachment type 
     for ( var mimeType in ZmMimeTable._table) {
           this._msgController._listView[viewType].addAttachmentLinkHandler(mimeType, "alfresco", this.generateAttOption);
      }
     for (var i = 0 ; i < AlfMimeTable.list.length ; i ++ ) {
	 
	   this._msgController._listView[viewType].addAttachmentLinkHandler (AlfMimeTable.list[i],"alfresco",this.generateAttOption);	
     }

}

Org_Alfresco_Zimbra.prototype.generateAttOption = function(attachment){
var html = 
    "<a href='#' class='AttLink' style='text-decoration:underline;' " +
    "onClick=\"window.Alfresco_widget.onSaveToAlfresco('" + 
    attachment.ct + "','" + attachment.label + "','" + attachment.url +
    "');\">" +
    "Save to alfresco" + 
    "</a>";
    return html;
}

/* Handle 'Save to Alfresco' action */
Org_Alfresco_Zimbra.prototype.onSaveToAlfresco = function(ct,label,src)
{
    
    var uploadDlg = this._getUploadDlg();
    var d = uploadDlg._getContentDiv (); /* Initialize the Upload Dialog */
    Alfresco_clearElement (d);

    var div = document.createElement ("div");
    div.className = "Alfresco_hCenter";

    var imgI = document.createElement ("img");
    imgI.setAttribute ("src", src);

    var pathMsg = document.createElement ("div");
    pathMsg.className = "Alfresco_hLeft";
    pathMsg.appendChild (document.createTextNode ("Select a Space to Store the Attachment: "));
    
    var pathHelpMsg = document.createElement ("div");
    pathHelpMsg.className = "Alfresco_hLeft_hint";
    pathHelpMsg.appendChild (document.createTextNode ("(Hint: Type / to start with alfresco root space or type ~ to start with your home space."));    
    pathHelpMsg.appendChild (document.createElement ("br"));
    pathHelpMsg.appendChild (document.createTextNode ("Once a space path is selected, type / to browse its child spaces if needed.)"));    

    var pathS = document.createElement ("div");
    pathS.className = "Alfresco_hLeft";
    pathS.id = "spacepathinputdiv";
    var pathI = document.createElement ("input");
    pathI.id = "spacepathinput";
    pathS.appendChild (pathI);
   
    var containerI = document.createElement ("div");
    containerI.id = "spacepathcontainer";
    pathS.appendChild (pathI);
    pathS.appendChild (containerI);
    
    var titleMsg = document.createElement ("div");
    titleMsg.className = "Alfresco_hLeft";
    titleMsg.appendChild (document.createTextNode ("Title: "));

    var titleS = document.createElement ("div");
    titleS.className = "Alfresco_hLeft";
    var titleI = document.createElement ("input");
    titleI.setAttribute("size", "40" );
    titleI.value=label;
    titleS.appendChild (titleI);

    var descMsg = document.createElement ("div");
    descMsg.className = "Alfresco_hLeft";
    descMsg.appendChild (document.createTextNode ("Description (Optional): "));

    var descS = document.createElement ("div");
    descS.className = "Alfresco_hLeft";
    var descI = document.createElement ("textarea");
    descS.appendChild (descI);

    var tagsS = document.createElement ("div");
    tagsS.className = "Alfresco_hLeft";
    tagsS.appendChild (document.createTextNode ("Tags (Optional): "));
    var tagsI = document.createElement ("input");
    tagsS.appendChild (tagsI);
    
    var brS = document.createElement ("br");
    var brS1 = document.createElement ("br");
    var brS2 = document.createElement ("br");
    var brS3 = document.createElement ("br");
    var brS4 = document.createElement ("br");

    
    div.appendChild (titleMsg);
    div.appendChild (titleS);
    div.appendChild (descMsg);
    div.appendChild (descS);
    div.appendChild (pathMsg);
    div.appendChild (pathHelpMsg);
    div.appendChild (pathS);
    div.appendChild (brS);
    div.appendChild (brS1);
    d.appendChild (div);


    uploadDlg.setButtonListener (DwtDialog.OK_BUTTON, new AjxListener (this, function() { this.onConfirmSaveToAlfresco (ct, label, src, pathI.value, titleI.value, descI.value, tagsI.value); }));
    uploadDlg.setButtonListener (DwtDialog.CANCEL_BUTTON, new AjxListener (this, function() { uploadDlg.popdown(); }));

    uploadDlg.popup();
    
    
    this.setupSpacePathAutoComplete();
}

/* Setup space path autocomplete using YUI AutoComplete widget */

Org_Alfresco_Zimbra.prototype.setupSpacePathAutoComplete = function(){
    // Instantiate an Script Node DataSource and define schema as an array:
    //     ["Multi-depth.object.notation.to.find.a.single.result.item",
    //     "Query Key",
    //     "Additional Param Name 1",
    //     ...
    //     "Additional Param Name n"]
    
	var alfTicket =  this.getTicket() ;
	
	var alfurl = this.getUserProperty("alfurl");	
	if(!alfurl)
		alfurl = this._zimletContext.getConfig("alfurl");	

	var alfEasyNavWSUrl = ["http://",alfurl,ALF_WCWS_URL_PREFIX,"/easy/nav","?ticket=",alfTicket].join("");

    this.oACDS = new YAHOO.widget.DS_ScriptNode(alfEasyNavWSUrl, ["nodeList","path"]);
    this.oACDS.scriptQueryParam = "query";

    // Instantiate AutoComplete
    this.oAutoComp = new YAHOO.widget.AutoComplete("spacepathinput","spacepathcontainer", this.oACDS);
    this.oAutoComp.formatResult = function(oResultItem, sQuery) {        
        return "<div class=\"result\"> &nbsp;<span class=\"name\">" + oResultItem[0] + "</span></div>";
    };

    // Stub for form validation
    this.validateForm = function() {
        // Validation code goes here
        return true;
    };
}

/* Upload a single attachment to Alfresco */
Org_Alfresco_Zimbra.prototype.onConfirmSaveToAlfresco = function (ct, label, src, path, title, desc, tags)
{
	

    /* Show a busy message indicating that the file is being uploaded */
    var busy = document.createElement ("div");
    busy.className = "Alfresco_hCenter";

    var busyImgS = document.createElement ("span");
    busyImgS.className = "Alfresco_hCenter";
    var busyImg = document.createElement ("img");
    busyImg.setAttribute ("src", ALFRESCO_BUSYIMGURL);
    busyImgS.appendChild (busyImg);

    var busyTextS = document.createElement ("span");
    busyTextS.className = "Alfresco_hCenter";
    busyTextS.appendChild (document.createTextNode ("Please wait while the document is being uploaded"));

    busy.appendChild (busyImgS);
    busy.appendChild (busyTextS);

    var uploadDlg = this._getUploadDlg();
    var d = uploadDlg._getContentDiv();
    Alfresco_clearElement (d);

    d.appendChild (busy);

    uploadDlg.setButtonEnabled (DwtDialog.OK_BUTTON, false);
    uploadDlg.setButtonEnabled (DwtDialog.CANCEL_BUTTON, false);

    title = title || "";
    tags = tags || "";

    /* Make a call to zimbra.jsp to upload the selected document to Alfresco */
    
    var alfTicket =  this.getTicket() ;

    var url = this.getResource("zimbra.jsp");
	console.log(url);
    var alfrescoparams = [["ticket",alfTicket]];
    if (path.length >0)  { alfrescoparams.push (["path", path]); }
    if (title.length >0) { alfrescoparams.push (["title", title]); }
    if (desc.length >0)  { alfrescoparams.push (["desc", desc]); }
    if (tags.length >0)  { alfrescoparams.push (["tags", tags]); }

	var alfurl = this.getUserProperty("alfurl");
	
	if(!alfurl)
			alfurl = this._zimletContext.getConfig("alfurl");
			
    var params= ["src=" + AjxStringUtil.urlComponentEncode(src),
    		 "alfurl="+alfurl,
                 "ticket=" + alfTicket,
                 "name=" + AjxStringUtil.urlEncode (label),
                 "path=" + AjxStringUtil.urlEncode (path),
                 "title=" + AjxStringUtil.urlEncode (title),
                 "desc=" + AjxStringUtil.urlEncode (desc),
                 "tags=" + AjxStringUtil.urlEncode (tags)
                ].join ("&");


    var callback = new AjxCallback (this,this.onDoneSaveToAlfresco);
    AjxRpc.invoke(params,url+"?"+params,null,callback,false);
}

Org_Alfresco_Zimbra.prototype._getUploadDlg = function(){
    if(!this.uploadDlg){
        this.uploadDlg = new DwtDialog (appCtxt.getShell(),null,"Save Attachment to Alfresco",[DwtDialog.OK_BUTTON,DwtDialog.CANCEL_BUTTON]);
    }
    return this.uploadDlg;
};

/* Callback function after a document has been uploaded to Alfresco 
   @result  contains the result of the Alfresco upload operation 
 */
Org_Alfresco_Zimbra.prototype.onDoneSaveToAlfresco = function(result)
{
	console.log(result.text);
    var uploadDlg = this._getUploadDlg();
    
    var d = uploadDlg._getContentDiv();
    Alfresco_clearElement (d);

    var jso = null;


    try {
        
        jso = eval('(' + result.text + ')');
        
        this.debug ("Alfresco Upload - status=" + jso.status);
        this.debug ("Alfresco Upload - result=");
        this.debug ("<xmp>" + result.text + "</xmp>");
    } catch (e) {

        this.debug ("Alfresco Upload Failed:");
console.log(e.toString());
        this.debug (e.toString());
    }

    var statusS = document.createElement ("span");
    statusS.className = "Alfresco_hCenter";
    var detailS = document.createElement ("span");
    detailS.className = "Alfresco_hCenter";

    if (jso.status) {
        statusS.appendChild (document.createTextNode ("Upload to Alfresco succeeded"));
        detailS.appendChild (document.createTextNode ("Message: " + jso.msg));
    } else {
        statusS.appendChild (document.createTextNode ("Upload to Alfresco failed"));
        this.debug ("<xmp>" + result.text + "</xmp>");
    }

    d.appendChild (statusS);
    d.appendChild (detailS);

    uploadDlg.setButtonEnabled (DwtDialog.OK_BUTTON, true);
    uploadDlg.setButtonEnabled (DwtDialog.CANCEL_BUTTON, true);

    uploadDlg.setButtonListener (DwtDialog.OK_BUTTON, new AjxListener (this, function() { uploadDlg.popdown(); }));
    uploadDlg.setButtonListener (DwtDialog.CANCEL_BUTTON, new AjxListener (this, function() { uploadDlg.popdown(); }));
    if (!uploadDlg.isPoppedUp()) { uploadDlg.popup(); }
    
    uploadDlg.setLocation(200,200);
    
}

Org_Alfresco_Zimbra.prototype.msgDropped = function(msg)
{
    var links = msg.attLinks;
    if ((links != null) && (links.length != 0)) {
        this.attLinks = links;
    }
}

Org_Alfresco_Zimbra.prototype.addMsg = function (msg)
{
	// locate the composer control and set up the callback handler
	var composer = appCtxt.getApp(ZmApp.MAIL).getComposeController();

	composer._composeView._htmlEditor.setContent( composer._getBodyContent()+" "+msg);

}

AlfrescoNavTree = function()
{
    var tree, currentIconMode, alfurl="xxx", alfTicket="xxx", zimlet;
    

    function changeIconMode() {
        var newVal = parseInt(this.value);
        if (newVal != currentIconMode) {
            currentIconMode = newVal;
        }
        buildTree();
    }
    
    
	function loadNodeData(node, fnLoadComplete)  {

		var nodeLabel = encodeURI(node.data.path);
		
		alfurl = zimlet.getAlfUrl();
		            
        alfTicket = zimlet.getTicket();
            
		var sUrl = ["http://",alfurl,ALF_WCWS_URL_PREFIX,"/easy/tree","?ticket=",alfTicket,"&p=",nodeLabel,"&callback=alfCallback"].join("");
				
		var result = AjxRpc.invoke(null, ZmZimletBase.PROXY + AjxStringUtil.urlComponentEncode(sUrl), null, null,true);
		
		if ( result.success ) {
		
			var alfResult = eval('(' + result.text + ')');
			
			if ( alfResult.children != null ) {
			
				for (var i=0, j=alfResult.children.length; i<j; i++) {
					var tempNode = new YAHOO.widget.AlfNode(alfResult.children[i], node, false, false);
						if ( alfResult.children[i].isDocument )
							tempNode.isLeaf = true; 
				}			
			
			}
			
			node.loadComplete();				
		}
				
	}

	function buildTree() {
		   
	   //create a new tree:
	   tree = new YAHOO.widget.TreeView("treeDiv1");

	   //turn dynamic loading on for entire tree:
	   tree.setDynamicLoad(loadNodeData, currentIconMode);

	   //get root node for tree:
	   var root = tree.getRoot();
	

	   //add child nodes for tree; our top level nodes are
	   //all the states in India:

	   var companyHome = { label: "Company Home", path:"/Company Home", title: "Company Home" }; 

	   var tempNode = new YAHOO.widget.AlfNode(companyHome, root, false, false);

	   //render tree with these toplevel nodes; all descendants of these nodes
	   //will be generated as needed by the dynamic loader.
	   tree.draw();
	   	   
	}

    return {
        init: function(zimletInput) {
        	        	
            YAHOO.util.Event.on(["mode0", "mode1"], "click", changeIconMode);

            var el = document.getElementById("mode1");
            if (el && el.checked) {
                currentIconMode = parseInt(el.value);
            } else {
                currentIconMode = 0;
            }
            
            zimlet = zimletInput;            
            
            buildTree();
            
            var args = {};
            
            tree.subscribe("checkClick", this.onCheckDocuments,args);
        },

    
    
		getCheckedNodes: function(nodes) {
			nodes = nodes || tree.getRoot().children;
			checkedNodes = [];
			for(var i=0, l=nodes.length; i<l; i=i+1) {
				var n = nodes[i];
				//if (n.checkState > 0) { // if we were interested in the nodes that have some but not all children checked
				if (n.checkState === 2) {
					checkedNodes.push(n); // just using label for simplicity
				}

				if (n.hasChildren()) {
					checkedNodes = checkedNodes.concat(this.getCheckedNodes(n.children));
				}
			}

			return checkedNodes;
		},
		
		
		
		
		// (event handler) called when alfresco documents are selected for attachment
		// display list of selected documents with download and short links.
		onCheckDocuments: function(type, args)
		{
		    //Populate the list of selected alfresco documents
		    var isDocument = type.data.isDocument;
		    var name = type.data.label;
		    var src = type.data.src;
		    
		    var view = new DwtComposite (zimlet.getShell());
			var args = {title: "Selected Documents", view: view};
			var dlg = zimlet._createDialog (args);
			    
			var info  ="<table class='Alfresco_iTable'>";
		    info +="<tr><th>Name</th><th>Path</th><th>Actions</th></tr>";

			var docs = zimlet.getSelectedDocuments();

			if (docs != null) {

				for ( var i = 0 ; i < docs.length ; i ++ ) {

					var docSrc = docs[i].src;

					var docName = docs[i].name;

					var docPath = docs[i].path;

					var docDLink = docs[i].dlink;

					var docShortLink = "<a href=\\'"+docs[i].shortlink+"\\'>"+docName+"</a>";

					info +="<tr>";
					info +="<td>"+docName +"</td>";
					info +="<td>"+docPath +"</td>";
					info +="<td><a class='AttLink' style='text-decoration:underline;' href='"+docDLink +"'>Download</a> | ";
					info +="<a href='#' class='AttLink' style='text-decoration:underline;' onClick=\"window.Alfresco_widget.addMsg('"+docShortLink +"')\">Paste Short Link</a></td>";
					info +="</tr>";
						
				}

			}

			info +="</table>";
					
			view.getHtmlElement().innerHTML = info;
			   				
			dlg.setButtonListener (DwtDialog.OK_BUTTON, new AjxListener(this,function() { dlg.popdown(); dlg.dispose(); }));
			dlg.setButtonListener (DwtDialog.CANCEL_BUTTON, new AjxListener(this,function() { dlg.popdown(); dlg.dispose(); }));
    		dlg.popup();
		
		}
		
    
    }
	
} ();

/* removes all child nodes of a dom element */
function Alfresco_clearElement (el)
{
    if (!el) { return; }
    while (el.childNodes.length > 0)
    {
        var firstchild = el.childNodes[0];
        el.removeChild (firstchild);
        firstchild = null;
    }
}

/* AlfrescoTabView -- a class that implements the dialog box for attaching documents from Alfresco */

AlfrescoTabView = function (parent, zimlet, alfurl, alfTicket)
{
    // initialize the `zimlet' member to point to the alfresco zimlet
    this.alfurl = alfurl;
    this.alfTicket = alfTicket;
    
    this.zimlet = zimlet;
    DwtTabViewPage.call (this,parent);
}

AlfrescoTabView.prototype = new DwtTabViewPage;
AlfrescoTabView.prototype.constructor = AlfrescoTabView;

AlfrescoTabView.prototype.toString = function() {
    return "AlfrescoTabView";
}

AlfrescoTabView.prototype.gotAttachments = function() {
    return (this.zimlet.getSelectedDocuments().length > 0);
}

AlfrescoTabView.prototype._createProgressDivs = function(){

    var apDiv = document.createElement ("div");
    apDiv.className = "Alfresco_busyMsg";

    /* the 'work in progress' image */
    var apbusyDiv = document.createElement ("div");
    var busyimg = document.createElement ("img");
    busyimg.setAttribute ("src", ALFRESCO_BUSYIMGURL);
    apbusyDiv.appendChild (busyimg);
    apDiv.appendChild (apbusyDiv);

    /* the progress text div */
    var approgressDiv = document.createElement ("div");
    approgressDiv.appendChild (document.createTextNode ("Please wait while your documents are being attached"));
    apDiv.appendChild (approgressDiv);

    this.apDiv = apDiv;
    this.approgressDiv = approgressDiv;
};

AlfrescoTabView.prototype.getApprogressDiv = function(){
    if(!this.approgressDiv){
        this._createProgressDivs();
    }
    return this.approgressDiv;
};

AlfrescoTabView.prototype.getApDiv = function(){
    if(!this.apDiv){
        this._createProgressDivs();
    }
    return this.apDiv;
};

AlfrescoTabView.prototype._createHtml = function()
{ 
    this._contentEl = this.getContentHtmlElement ();
    this._contentEl.innerHTML = "";
    
    this.treeDiv = document.createElement ("div");    
    this.treeDiv.id = "treeDiv1";
    this.treeDiv.className = "treeNav";
    
}

/* Utility functions to show various stages of progress when the tab-view is visible */
AlfrescoTabView.prototype.showAttachingDocuments = function ()
{
    this.showElement (this.getApDiv());
}

/* Updates the view of attaching documents */
AlfrescoTabView.prototype.showAttachProgress = function ()
{
    Alfresco_clearElement (this.getApprogressDiv());
    this.getApprogressDiv().appendChild (document.createTextNode ("Attached " + (this.zimlet.attach_current + 1) + " of " + this.zimlet.attach_documents.length + " documents"));
}

AlfrescoTabView.prototype.resetAttachProgress = function ()
{
    Alfresco_clearElement (this.getApprogressDiv());
    this.getApprogressDiv().appendChild (document.createTextNode ("Please wait while your documents are being attached"));
}

// Utility function to show custom text in the attachment dialog. Useful when something else needs to be shown
AlfrescoTabView.prototype.showElement = function (el)
{
    Alfresco_clearElement (this._contentEl);
    this._contentEl.appendChild (el);
}

// Overridden function to draw the (contents of the) Alfresco Documents tab in the Attach Files dialog box
AlfrescoTabView.prototype.showMe = function ()
{
    // clear the main view prior to displaying anything
    Alfresco_clearElement (this._contentEl);
    
    this.resetAttachProgress ();
    
    this.showElement (this.treeDiv);
    
    AlfrescoNavTree.init(this.zimlet);

    DwtTabViewPage.prototype.showMe.call(this,parent);
   	this.setSize(Dwt.DEFAULT, "240");
}

AlfrescoTabView.prototype.getCheckNodes = function() {
    return AlfrescoNavTree.getCheckedNodes();
}
