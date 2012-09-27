// there are many characters that are valid in file system paths
// that are NOT valid DOM identifiers, convert them here
// replace / with __SLASH__
// replace . with __DOT__

function convertPathToDomId(path) {
    var next = path;
    next = path.replace(/\//g, "__SLASH__");
    next = next.replace(/\./g, "__DOT__");
    return next;
}

// same process as above, in reverse

function convertDomIdToPath(domId) {
    var next = domId;
    next = next.replace(/__SLASH__/g, "/");
    next = next.replace(/__DOT__/g, ".");
    return next;
}

// programatically select a node in the directory tree

function selectPath(path) {
    $("#files").jstree("deselect_all");
    var domId = convertPathToDomId(path);
    console.log("trying to select #" + domId);
    $("#files").jstree("select_node", "#" + domId);
}

// programatically expand a directory in the tree

function expandPath(path) {
    var domId = convertPathToDomId(path);
    console.log("trying to open #" + domId);
    $("#files").jstree("open_node", "#" + domId);
}

// update the breadcrumbe to display the appropriate text for the given path

function updateBreadcrumb(path) {
    var pieces = path.split("/");
    var content = '<li><a href="#" onclick="selectPath(\'/\');"><img src="img/root.png"/></a></li>';
    var pathSoFar = "";
    for ( var i in pieces) {
        piece = pieces[i];
        if (piece != "") {
            pathSoFar += '/' + piece;
        }

        if (i == pieces.length - 1) {
            content += '<li>' + piece + '</li>'
        } else {
            content += '<li><a href="#" onclick="selectPath(\'' + pathSoFar
                    + '\');">' + piece
                    + '</a><span class="divider">/</span></li>';
        }

    }

    $('#folderBreadcrumb').empty();
    $('#folderBreadcrumb').append('<ul>' + content + '</ul>');

}

// refresh the table view (currently accomplished by finding the selected path,
// and re-selecting it)

function refreshTable() {
    // find the selected item
    var selectedId = $("#files").jstree('get_selected').attr('id')
    console.log("selected id is " + selectedId);

    selectPath(convertDomIdToPath(selectedId));
}

// identify the selected items
// confirm their deletion
// then send HTTP deletes
// refresh the table each time we get success
// display alert for any errors

function deleteSelectedItems() {
    var pathsToDelete = [];
    $('.trSelected', $('#flexfiles')).each(function(i) {
        var id = $(this).attr("id");
        console.log("id is " + id);

        if (id.indexOf("row") == 0) {
            id = id.substring(3);
            path = convertDomIdToPath(id);
            pathsToDelete.push(path);
        }

    });

    var confirmationMessage = "Are you sure you want to delete the following items?\n\n";
    for ( var i in pathsToDelete) {
        confirmationMessage += pathsToDelete[i] + "\n";
    }

    var confirmation = confirm(confirmationMessage);
    if (confirmation) {
        for ( var i in pathsToDelete) {
            $.ajax({
                type : "DELETE",
                url : pathsToDelete[i],
                success : function() {
                    // refresh the page?
                    refreshTable();
                },
                error : function() {
                    alert("Error deleting " + pathsToDelete[i]);
                }
            });
        }

    }
}

function cbfs_browser_tree_node_selected(event, data) {
    console.log("node selected");
    var node_id = $(this).jstree('get_selected').attr('id');
    var path = convertDomIdToPath(node_id);

    expandPath(path);

    var prefix = path;
    if (prefix == "/") {
        prefix = "";
    }

    updateBreadcrumb(path);

    console.log(node_id)
    // do a HEAD request and set the contents of info
    gethead = $
            .ajax({
                type : "GET",
                url : '/.cbfs/list' + path + "?includeMeta=true",
                success : function(data, textStatus, jqXHR) {

                    var rows = "";

                    for ( var j in data.dirs) {
                        var dir = data.dirs[j];
                        var thisDirPath = prefix + "/" + j;
                        rows += '<tr><td><img src="img/folder.png"/><a href="#" onclick="selectPath(\''
                                + thisDirPath
                                + '\');">'
                                + j
                                + "</a></td><td>Directory</td><td>"
                                + dir.size
                                + "</td><td></td>";
                    }

                    for ( var i in data.files) {
                        var file = data.files[i];
                        var thisFilePath = prefix + '/' + i;
                        rows += '<tr id="row'
                                + convertPathToDomId(thisFilePath)
                                + '"><td><img src="img/file.png"/><a href="'
                                + thisFilePath + '">' + i + "</a></td><td>"
                                + file.ctype + "</td><td>" + file.length
                                + "</td><td>" + file.modified + "</td>";
                    }

                    // remove the old table
                    $('#flex').empty();
                    $('#flex').append(
                        '<table id="flexfiles" class="flexme1"><tbody>' + rows
                                + '</body></table>');

                    $("#flexfiles").flexigrid({
                        height : "auto",
                        colModel : [ {
                            display : 'Name',
                            name : 'iso',
                            width : '400',
                            sortable : true,
                            align : 'left'
                        }, {
                            display : 'Type',
                            name : 'name',
                            width : '200',
                            sortable : true,
                            align : 'left'
                        }, {
                            display : 'Size Name',
                            name : 'printable_name',
                            width : '200',
                            sortable : true,
                            align : 'right'
                        }, {
                            display : 'Last Modified',
                            name : 'iso3',
                            width : '200',
                            sortable : true,
                            align : 'left'
                        }, ]
                    });

                }
            });
}

function cbfs_browser_get_url_for_node(node) {
    var nodeId = "";
    var url = ""
    if (node == -1) {
        url = "/.cbfs/list/?includeMeta=true";
    } else {
        nodeId = node.attr('id');
        url = "/.cbfs/list" + convertDomIdToPath(nodeId) + "?includeMeta=true";
    }

    return url;
}

function cbfs_browser_reformat_tree_data(data, textStatus, jqXHR) {

    // build the object jstree wants
    response = [];

    for ( var j in data.dirs) {
        var dir = data.dirs[j];
        var prefix = data.path;
        if (prefix === "/") {
            prefix = "";
        }
        response.push({
            "data" : j,
            "state" : "closed",
            "attr" : {
                "id" : convertPathToDomId(prefix + "/" + j),
                "rel" : "folder"
            }
        })
    }

    // disabled for now, tree only shows folders
    // for(var i in data.files) {
    // var file = data.files[i];
    // response.push({ "data": i, "attr": { "id": prefix + "/" + i, "rel":
    // "default" }, "meta": file });
    // }

    return response;

}

function cbfs_browser_on_tree_ready(event, data) {
    expandPath("/");
    selectPath("/");
}

var cbfs_browser_tree_configuration = {
    "themes" : {
        "theme" : "classic",
        "dots" : true,
        "icons" : true
    },
    "plugins" : [ "themes", "json_data", "ui", "types" ],
    "json_data" : {
        "data" : [ {
            "data" : "/",
            "state" : "closed",
            "attr" : {
                "id" : convertPathToDomId("/"),
                "rel" : "drive"
            }
        } ],
        "ajax" : {
            "type" : 'GET',
            "url" : cbfs_browser_get_url_for_node,
            "success" : cbfs_browser_reformat_tree_data,
            "error" : function(y) {
                console.log("in error with");
                console.log(y);
            }
        }
    },
    "types" : {
        // I set both options to -2, as I do not need depth and children count
        // checking
        // Those two checks may slow jstree a lot, so use only when needed
        "max_depth" : -2,
        "max_children" : -2,
        // I want only `drive` nodes to be root nodes
        // This will prevent moving or creating any other type as a root node
        "valid_children" : [ "drive" ],
        "types" : {
            // The default type
            "default" : {
                // I want this type to have no children (so only leaf nodes)
                // In my case - those are files
                "valid_children" : "none",
                // If we specify an icon for the default type it WILL OVERRIDE
                // the theme icons
                "icon" : {
                    "image" : "./img/file.png"
                }
            },
            // The `folder` type
            "folder" : {
                // can have files and other folders inside of it, but NOT
                // `drive` nodes
                "valid_children" : [ "default", "folder" ],
                "icon" : {
                    "image" : "./img/folder.png"
                }
            },
            // The `drive` nodes
            "drive" : {
                // can have files and folders inside, but NOT other `drive`
                // nodes
                "valid_children" : [ "default", "folder" ],
                "icon" : {
                    "image" : "./img/root.png"
                },
                // those prevent the functions with the same name to be used on
                // `drive` nodes
                // internally the `before` event is used
                "start_drag" : false,
                "move_node" : false,
                "delete_node" : false,
                "remove" : false
            }
        }
    }
}