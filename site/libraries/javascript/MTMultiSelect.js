    /*
    Copyright (c) 2009 Justin Donato (http://www.justindonato.com)

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:
    
    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.
    
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
    
    MTMultiSelect: An widget to make more user friendly interfaces
    for a multiselect box, using Mootools    
    
    Usage:
    
    Link to this file, then add 
    
    window.addEvent('domready', function (){
         $$('.multiselect').each(function(multiselect){
            new MTMultiWidget({'datasrc': multiselect});
        });
            
    });
    
    to your page, where '.multiselect' is a selector that picks out a class of
    <select MULTIPLE> elements. This element acts as the data source for the
    widget. Then create a css file and style the widget however you'd like. 
    
    Options: add these to the object you pass to the MTMultiWidget constructor.
    Only datasrc is required.
    
    widgetcls:
    The css class applied to your final widget.
    Default is 'mtmultiselect'
    
    datasrc:
    A select multiple dom object
    
    selectedcls:
    The css class of the selected list item.
    Default is  'selected'
    
    paginator_on_bottom:
    Determines placement of paginator, true or false.
    Default is true
    
    items_per_page:
    Determines how many items to show on a single page.
    Default is 10.
    
    case_sensitive:
    Determines if the filter form is case_sensitive or not
    Default is False
       
    setview:
    Determines what view to show on initialization
    Possible values are 'selected', 'unselected' or 'total'
    default is 'total'
    */

    var MTMultiWidget = new Class({
        
        Implements: [Options],
                
        options: {
            'widgetcls': 'mtmultiselect', // the class for your final widget
            'datasrc': null  // a select multiple dom object
        },
        
        handleDisplayEvent: function(numselected){
            this.filterform.update(numselected);
        },
        
        handleFilterEvent: function(list){
            this.curlist = list;
            this.paginator.setpagenum(1);
            var page = this.paginator.getpage(list);
            this.displaylist.build(page);
        },

        handlePaginatorEvent: function(){
            var page = this.paginator.getpage(this.curlist);
            this.displaylist.build(page);
        },
        
        initialize: function(options){
            // Hide the original data source and create a new div for the widget
            // and inject this new widget into the Dom.
            options.datasrc.setStyles({'display': 'None'});
            var view = new Element('div', {'class': this.options.widgetcls});
            view.inject(options.datasrc, 'after');
            
            // Add the newly created widget to the options obj so other
            // components have a reference to it.
            options.view = view;
            this.setOptions(options);
            
            this.displaylist = new DisplayList(options);
            options.numselected = this.displaylist.numselected();
            
            this.filterform = new FilterForm(options);
            this.paginator = new Paginator(options);
            
            this.curlist = this.initialdata(options)
            
            this.displaylist.addEvent('rebuild', this.handleDisplayEvent.bind(this));
            this.filterform.addEvent('rebuild', this.handleFilterEvent.bind(this));
            this.paginator.addEvent('rebuild', this.handlePaginatorEvent.bind(this));
            
            var page = this.paginator.getpage(this.curlist);
            this.filterform.build();
            this.displaylist.build(page);
            this.setview(this.filterform, this.displaylist, options)            
        },
        
        setview: function(filterform, displaylist, options){
            if(options.setview == 'selected'){
                this.filterform.showselected();
            }
            else if(options.setview == 'unselected'){
                this.filterform.showunselected();
            }
            
        },
        
        initialdata: function(options){
            // moved this out to a method in case you want to implement an
            // ajax datasrc.
            return this.options.datasrc.getChildren();
        },
        
        refresh: function(){
            this.setview(this.filterform, this.displaylist, this.options);
            this.filterform.update(this.displaylist.numselected());
            return this;
        }
    });
    
    /*
        DisplayList
    */    
    
    var DisplayList = new Class({
        
        Implements: [Options, Events],
        
        options: {
            selectedcls: 'selected', // class of the item when its selected
            datasrc: null, // a multiple select dom element
            view: null, // A parent or wrapper dom element where this element lives
            paginator_on_bottom: true, // determines location of paginator
            represent: null
        },
        
        initialize: function(options){            
            this.setOptions(options);
        },
        
        build: function(opts){
            
            // If there's already an ol, remove it.
            var old = this.options.view.getElement('ol');
            if(old !== null) old.destroy();
            
            // create the list to hold the visible elements
            list = new Element('ol');
            place = this.options.paginator_on_bottom ? 'before' : 'after';
            list.inject(this.options.view.getLast(), place);
            //this.options.view.grab(list);
            
            opts.each(function(item){
                    var li = new Element('li',{
                        'class': item.selected ? this.options.selectedcls : null
                    });
                    
                    var repr;
                    if(this.options.represent){
                        repr = this.options.represent(item, li);
                    }
                    else{
                        repr = item.get('text');   
                    }
                    
                    li.set('text', repr);
                    
                    li.store('select', item);                    
                    list.grab(li);   
                    
                    li.addEvent('click', function(evt){
                        evt.target.toggleClass('selected');
                        evt.target.retrieve('select').selected = evt.target.hasClass('selected');                        
                        this.fireEvent('rebuild', this.numselected());
                    }.bind(this));
                }.bind(this));
        },
        
        total: function(){
            return this.options.datasrc.getChildren().length;
        },
        
        numselected: function(){
            var numselected = 0;            
            this.options.datasrc.getChildren().each(function(item){
                if(item.selected) numselected++;
            });
            return numselected;
        }        
        
    });
        
    /*
        Paginator
    */    

    var Paginator = new Class({
        Implements: [Options, Events],
     
        options: {
            'items_per_page': 10,
            'list': [], // the list the paginator will use
            'displaylist': null // the view element for the results
        },
        
        initialize: function(options){
            this.setOptions(options);
            this.items_per_page = this.options.items_per_page;
            this.page = 1;
            // create the view element
            this.controls = new Element('div', {'class':'mtms_paginator'});
            this.options.view.grab(this.controls);
        },
        
        numpages: function(list){
            return Math.ceil(list.length / this.items_per_page );
        },
        
        getpage: function(list){
            var start = ((this.page - 1) * this.items_per_page);
            var end = start + this.items_per_page;
            this.updateControls(list);
            return list.slice(start, end); 
        },
        
        pageup: function(){
            this.page++;
        },
        
        pagedown: function(){
            this.page--;
        },
        
        updateControls: function(list){
            
            var numpages = this.numpages(list);
            this.controls.empty();
            
            var prevbtn = new Element('a', {'text':'prev',
                                            'href':'javascript:void(0)'});
            this.controls.grab(prevbtn, 'top');
            prevbtn.addClass('disabled');
            
            if(this.page > 1){
                prevbtn.removeClass('disabled');
                prevbtn.addEvent('click', function(evt){
                    this.pagedown();
                    this.fireEvent('rebuild', list);                     
                }.bind(this));
            }
            
            for(var i = 1; i <= numpages; i++){
                this.controls.grab(new Element('a', {'text': i,
                                                     'href': '#cpcspswdnbd',
                                                     'class': (i  == this.page) ? 'selected' : '',
                                                     'events': {
                                                        'click': function(evt){
                                                            this.setpagenum(evt.target.innerHTML);
                                                            this.fireEvent('rebuild', [list]); // wrapped list
                                                        }.bind(this)}
                                               }), 'bottom');
            }

            var nextbtn = new Element('a', {'text':'next',
                                            'href':'#cpcspswdnbd'});
            this.controls.grab(nextbtn);
            nextbtn.addClass('disabled');
                
            if(this.page < numpages){
                nextbtn.removeClass('disabled');
                nextbtn.addEvent('click', function(evt){
                    this.pageup();
                    this.fireEvent('rebuild');
                }.bind(this));
            }

        },
        
        setpagenum: function(pagenum){
            this.page = Number(pagenum);
        }
    });
    
    /*
        FilterForm
    */

    var FilterForm = new Class({
        
        RESETINPUT: true,
        
        Implements: [Options, Events],        
        
        options: {
            view: null,
            case_sensitive: false,
            displaylist: null,
            inputpos: 'top',            
            labels: {'total': 'total',
                     'selected': 'selected',
                     'unselected': 'unselected',
                     'selectall': 'select all',
                     'selectnone': 'select none',
                     'filter': 'filter',
                     'in': 'in',
                     'out': 'out',
                     'page': 'page'
                    },
            classes: {
                'total': 'mttotal',
                'selected': 'mtselected'
            }
        },
        
        initialize: function(options){
            this.setOptions(options);
            this.numselected = options.numselected;
        },
        
        build: function(){
            // infofilter bar is made out of a u list
            var ul = new Element('ul', {'class': 'mtms_filtercontrols'});
            this.options.view.grab(ul, this.options.inputpos);
            
            this.totalbtn = this.makebtn(this.options.labels.total,
                         this.showtotal,
                         this.options.datasrc.getChildren().length);
            ul.grab(this.totalbtn);
            
            this.selectedbtn = this.makebtn(this.options.labels.selected,
                                    this.showselected,
                                    this.numselected);
            ul.grab(this.selectedbtn);
            
            this.unselectedbtn = this.makebtn(this.options.labels.unselected,
                                    this.showunselected,
                                    this.options.datasrc.getChildren().length - this.numselected);
            ul.grab(this.unselectedbtn);

            this.selectAllBtn = this.makebtn(this.options.labels.selectall,
                                    this.selectAll,
                                    '');
            ul.grab(this.selectAllBtn);

            this.selectNoneBtn = this.makebtn(this.options.labels.selectnone,
                                    this.selectNone,
                                    '');
            ul.grab(this.selectNoneBtn);
            
            // Make text field for filter
            // On keyup, the displaylist.filter is called with a function
            // that filters based on what's been entered in the textfield
            filterbox_container = new Element('div', {'class': 'mtms_filterbox'});            
            this.filterbox = new Element('input', {
                'events': {
                    'keyup': function(evt){                        
                        if(this.options.case_sensitive){
                            filter_by_text = function(item){ return item.text.contains(evt.target.value)};
                        } else {
                            filter_by_text = function(item){ return item.text.toLowerCase().contains(evt.target.value.toLowerCase()) };
                        }
                        this.filter(this.options.datasrc.getChildren(), filter_by_text);
                    }.bind(this)
                }
            });
            
            var lblFilter = new Element('label', {'style': 'min-width: 50px;' });
            lblFilter.set('text', 'filter: ');
            filterbox_container.grab(lblFilter);            
            filterbox_container.grab(this.filterbox);            
            this.options.view.grab(filterbox_container, this.options.inputpos);
        },                       

        /*
           label: clickable link text
           func: the function that is called when clicked
           prefix: some bit of text that precedes the label. (Used to show
           counts here.)
           
        */
        makebtn: function(label, func, prefix){
            var li = new Element('li');  
            var btn = new Element('a', {'html': label,
                                        'href': '#cpcspswdnbd',
                                        'events': {
                                             // You might have to bind this differently
                                            'click': func.bind(this)
                                        }
                                    });
            li.grab(btn);
            if(prefix !== undefined){
                prefix = new Element('span', {'text': prefix});
                li.grab(prefix);                
            }
            return li;
        },
        
        showtotal: function(){
            // return true for every item in the datasrc
            this.filter(this.options.datasrc.getChildren(),
                function(item){
                    return true;
                },
                this.RESETINPUT    
            );
        },
        showselected: function(){
            this.filter(this.options.datasrc.getChildren(),
                function(item){
                    return (item.selected === true);
                },
                this.RESETINPUT                
            );
        },
        showunselected:function(){
            this.filter(this.options.datasrc.getChildren(),
                function(item){
                    return (item.selected !== true);
                },
                this.RESETINPUT                
            );
        },
        selectAll:function(){
            this.options.datasrc.getChildren().each(
                function(item){
                    item.selected = true;
                }            
            );
            this.fireEvent('rebuild', [this.options.datasrc.getChildren()]);
            this.update(this.options.datasrc.getChildren().length);
        },
        selectNone:function(){
            this.options.datasrc.getChildren().each(
                function(item){
                    item.selected = false;
                }            
            );
            this.fireEvent('rebuild', [this.options.datasrc.getChildren()]);
            this.update(0);
        },

        // list is the list of option dom elements from the select elem
        // test is a function that gets used in the filter
        filter: function(list, test, reset){
            results = list.filter(function(item, index){
                return test(item);
            });
            
            if(reset){
                this.filterbox.value = "";
            }
            this.fireEvent('rebuild', [results]);
        },
        update: function(numselected){
            var total = this.options.datasrc.getChildren().length;
            this.totalbtn.getElement('span').set('text', total);
            this.selectedbtn.getElement('span').set('text', numselected);
            this.unselectedbtn.getElement('span').set('text', total - numselected);            
        }
    });

    Element.Events.rebuild = {
        'base': 'change',
        'condition': function(evt){
            return;
        }
    };
