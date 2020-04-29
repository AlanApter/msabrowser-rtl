function MSAProcessor({
    fasta,
    hasConsensus = false,
    colorSchema
}) {
        this.sequenceDetails = [];
        this.processedSequences = [];

        this.extractLinkFromId = function(proteinId){
            var proteinType = proteinId.substring(0, 2);
            if (proteinType == "NP" || proteinType == "XP") {
                link = "https://www.ncbi.nlm.nih.gov/protein/" + proteinId;
            }
            if (proteinType == "EN") {
                link = "https://www.ensembl.org/id/" + proteinId;
            }
            
            regexPattern = "[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}"
            if (proteinId.search(regexPattern) != "-1") {
                proteinId = proteinId.split(" ")[1];
                link = "https://www.uniprot.org/uniprot/" + proteinId;
            }

            return link;
        }
       

        this.loadSeq = function(fasta) {
            let firstStartPointer, endPointer, currentStartPointer = -1;

            do {
                firstStartPointer = fasta.indexOf(">", firstStartPointer + 1);
                endPointer = fasta.indexOf("\n", firstStartPointer + 1);
                currentStartPointer = fasta.indexOf(">", firstStartPointer + 1);
                let sequence = fasta.slice(endPointer + 1, currentStartPointer);
                //removing new line characters inside seq1
                sequence = sequence.replace(/\s/g, "");
    
                this.processedSequences.push(sequence);
                //Protein Name-Identifier
                let proteinName = fasta.slice(firstStartPointer + 1, endPointer + 1);
                let proteinId = proteinName.split(" ")[0]; 
                let species = proteinName.split("[").slice(-1)[0].split("]")[0];
                let speciesByWord = species.split(" ");
                species = speciesByWord[0][0] + ". " + speciesByWord[1];
                var link = this.extractLinkFromId(proteinId);
                this.sequenceDetails.push({
                    link: link,
                    species: species,
                    proteinId: proteinId,
                    rawProteinName: proteinName
                });
    
            } while (currentStartPointer != -1);
            
        }

        // Time To Run
        loadSeq(fasta);

        this.addConsensus = function() {
            let consensus_logo = "";
            var aaCount = this.processedSequences[0].length;
            for (let aaInd = 0; aaInd < aaCount; aaInd++) {
                var position_dict = {};
                for (let proteinIndex = 0; proteinIndex < this.processedSequences.length; proteinIndex++) {
                    var protein = this.processedSequences[proteinIndex];
                    var aminoacid = protein[aaInd];
                    position_dict[aminoacid] = aaInd;
            }
                if (Object.keys(position_dict).length == 1){
                    consensus_logo = consensus_logo.concat(aminoacid);
                }
                else if (Object.keys(position_dict).length == this.processedSequences.length/2) {
                    consensus_logo = consensus_logo.concat(':');
                }
                else if (Object.keys(position_dict).length == this.processedSequences.length)
                {
                    consensus_logo = consensus_logo.concat('-');
                }
                else{
                    consensus_logo = consensus_logo.concat('.');
                }
            }
            this.sequenceDetails.push({
                link: '#',
                species: 'Consensus',
                proteinId: 'Consensus',
                rawProteinName: 'Consensus'
            });
            this.processedSequences.push(consensus_logo);
            
    }

    if(hasConsensus) {
        this.addConsensus();
    }

    return this;
};

function renderMSATemplate({
    ids,
    title = ""
}){
    return `
    <section class="msa-container">
        <!--Current Project | Domains and Sequences Parts -->
        <section id="${ids.domainSequence}" class="domain-sequence">
            
            <!-- Current Project | Protein Domains for Human -->
            <section id="${ids.proteinLength}" class="protein-length">
            </section> <!-- end of domains -->

            <!-- Current Project | Protein Sequences -->
            <section id="${ids.sequence}" class="sequence-container">
                <div id="${ids.aminoacidInfo}" class="aminoacid-info"></div>
            </section> <!-- end of protein sequences -->

        </section> <!-- end of domain and sequences parts -->

        <!--Gene name and specie names-->
        <section id="${ids.nameContainer}" class="species-and-gene-names">
            <div id="${ids.geneName}" class="gene-name"><br>${title}</div>
            <div id="${ids.speciesNames}" class="species-names"></div>
        </section>
        
    </section>
    `;
}

function MSAViewer({   // notice the curly braces! we are receiving an object now
    id,
    msa,
    title = "",
    variations = [],
    templateFunction = renderMSATemplate
  }) {

    function i_(name) {
        return `${id}-${name}`;
    }
    this.id = id;
    this.ids = {
        id: id,
        domainSequence: i_('-domain-sequence'),
        proteinLength: i_('-protein-length'),
        sequence: i_('-sequence'),
        aminoacidInfo: i_('-aminoacid-info'),
        nameContainer: i_('-name-container'),
        geneName: i_('-gene-name'),
        speciesNames: i_('-species-names'),
        positionInput: i_('-position'),
        speciesSelect: i_('-species-select')
    }
    this.msa = msa;
    this.variationNotes = {};
    this.ptmNotes = {};
    this.loadedPositions = [];
    for (i = 0; i < msa.processedSequences[0].length; i++) {
        this.loadedPositions.push(false);
    }
    var that = this;
    
    function loadProteins(msa) {
        var ids = that.ids;
        var proteinLengthforDomain = "width:" + msa.processedSequences[0].length * 20 + "px;"; 
        document.getElementById(ids.proteinLength).style = proteinLengthforDomain;

        for(var i in msa.sequenceDetails) {
                    //creating flex container for proteins
            var sequenceDetails = msa.sequenceDetails[i];

            let protein = document.createElement("section");
            document.getElementById(ids.sequence).appendChild(protein);
            protein.id = sequenceDetails.proteinId;
            protein.className = "protein";
            var speciesName = document.createElement("div");
            var speciesNameLink = document.createElement("a");
            var speciesTooltip = document.createElement('span');
            
            speciesNameLink.setAttribute("href", sequenceDetails.link);
            speciesNameLink.setAttribute('target', '_blank');
            speciesTooltip.setAttribute('class', 'tooltiptext');
            speciesTooltip.innerHTML = sequenceDetails.proteinId;

            document.getElementById(ids.speciesNames).appendChild(speciesName).appendChild(speciesNameLink);
            document.getElementById(ids.speciesNames).appendChild(speciesName).appendChild(speciesTooltip);
            speciesName.className = "species-name tooltip";
            speciesNameLink.appendChild(document.createTextNode(sequenceDetails.species));
        }

    }
    
    function loadViewportToAANumber(msa){
        viewportToAANumber = [];

        for(i in msa.processedSequences){
            sequence = msa.processedSequences[i];
            viewportToAANumber.push([]);
            aa_ind = 0;
            for (ind = 0; ind < sequence.length; ind++) {
    
                if (sequence.charAt(ind) == '-') {
                    viewportToAANumber[i].push(-1);
                    continue;
                } else {
                    viewportToAANumber[i].push(aa_ind);
                    aa_ind++;
                }
            }
        }
    }
    document.getElementById(id).innerHTML = templateFunction({ids: this.ids, title: title});
    loadProteins(msa);
    this.viewportToAANumber = loadViewportToAANumber(msa);

    this.mainDiv = $('#' + id).find('.msa-container');

    this.loadAminoacidSearch(msa);

    function getOffsetX(prNumber, aaNumber) {
        var indexOfAA = that.getAminoacidPositionInViewport(prNumber, aaNumber);

        var offsetX = indexOfAA * 20 + 30;

        return offsetX;
    }

    this.showVariation = function(prNumber, aaNumber) {

        let textBox = document.createElement("div");
        let innerTextBox = document.createElement("div");
        textBox.setAttribute("class", "variation-text-box");
        innerTextBox.setAttribute("class", "variation-inner-text-box");

        proteinNotes = this.variationNotes[prNumber];
        for (var source in proteinNotes[aaNumber]) {
            innerTextBox.innerHTML += "<h3>" + source + "</h3>" + proteinNotes[aaNumber][source];
            //console.log(source);
        }
        var aminoacidInfoBox = document.getElementById(this.ids.aminoacidInfo);
        aminoacidInfoBox.innerHTML = '';
        aminoacidInfoBox.appendChild(textBox).appendChild(innerTextBox); // time to insert the textBox into aminoacidInfoBox | eski: aminoacidInfoBox.appendChild(textBox)
        $(".variation-inner-text-box").mouseleave(function (e) {
            var aminoacidInfo = document.getElementById(that.ids.aminoacidInfo);
            aminoacidInfo.innerHTML = "";
        });

        offsetX = getOffsetX(prNumber, aaNumber);
        var container = document.getElementById(this.id).getElementsByClassName("protein")[0];

        if (container.scrollWidth < (offsetX + 600)) {
            offsetX = offsetX - 340;

            textBox.className = "rightArrow";
        }
        let specificPositionforCVBox = "top: " + (prNumber * 20 - 13) + "px;" + "left: " + (offsetX) + "px;  box-shadow:#555 1px 1px 5px 3px;";
        document.getElementById(this.ids.aminoacidInfo).childNodes[0].style.cssText = specificPositionforCVBox;

    }

    for(i in variations) {
        variation = variations[i];
        this.addVariation(variation['protein'], variation['aminoacid'], variation['note'], variation['source']);
    }

    if ((typeof(domains) != "undefined") && (domains.length != 0)) {
        this.addDomains(domains);
    }
    this.loadDivsInViewport();
    this.mainDiv.scroll(function() {
        that.loadDivsInViewport();
    });

    this.loadDomainBar();

}


MSAViewer.prototype.loadDomainBar = function() {
    var that = this;
    $('.domain').each(function() {
        //console.log($(this).data('start-point'), );
        startPosition = that.getAminoacidPositionInViewport(0, parseInt($(this).data('start-point'))-1);

        width = that.getAminoacidPositionInViewport(0, parseInt($(this).data('end-point'))-1) - startPosition;

        $(this).css('display', 'flex');
        $(this).css('left', (startPosition*20)+'px');
        $(this).width((width*20)+'px');
    });

    $(document).on('mouseover', '.specialAa', function(){
        prNumber = $(this).data('sid');
        aaNumber = parseInt($(this).attr('class').split(' ')[0].split('-')[1])
        that.showVariation(prNumber, viewportToAANumber[prNumber][aaNumber]);
    });

        
    var ids = this.ids;
    $('.protein').width(($('#'+ids.proteinLength).width())+'px');
    $('#'+ids.sequence).width(($('#'+ids.proteinLength).width())+'px');
}

MSAViewer.prototype.getAminoacidPositionInViewport = function(species_id, position) {
    var sequence = this.msa.processedSequences[species_id];
    var aminoacidIndex = 0;
    for(i = 0; i< sequence.length; i++){
    if(sequence.charAt(i) == '-')
        continue;
    if(aminoacidIndex == position){
        return i;
    }
    if(sequence.charAt(i) != '-'){
        aminoacidIndex++;
    }
    
    }
    return -1;
}


MSAViewer.prototype.loadAminoacidSearch = function() {
    var ids = this.ids;
    var that = this;
    $mainDiv = this.mainDiv;
    containerTemplate = `<section class="go-to-position">
        Search a position: <input type="number" placeholder="3" name="position" class="form_input" id="${ids.positionInput}">
        Species : <select name="species" id="${ids.speciesSelect}"></select><br>
        </section>`;
        

    if($mainDiv.find('.go-to-position').length == 0)
        $mainDiv.append(containerTemplate);
    
    function positionKeyUpCallback() {
        var position = $('#'+that.ids.positionInput).val();
        var species = parseInt($('#'+that.ids.speciesSelect).val());
        var alignmentPosition = that.getAminoacidPositionInViewport(species, position - 1);
        
        $mainDiv.find('.highlight-column').removeClass('highlight-column ptm-highlighted');
        $mainDiv.find('.position-number').remove();
        
        template = `<div class="highlight-column position-number" style="left:${alignmentPosition * 20}px">${position}</div>`;

        $mainDiv.find('.protein:eq(0)').append(template);

        $mainDiv.scrollLeft(alignmentPosition * 20 - ($mainDiv.width() - 160) / 2)

        setTimeout(function () {
            $mainDiv.find('.i-' + alignmentPosition).addClass('highlight-column');
            $mainDiv.find('.protein:eq(' + species + ') .ptm.i-' + alignmentPosition).addClass('ptm-highlighted');
        }, 75);
    }

    for(var i in this.msa.sequenceDetails) {
        var species = this.msa.sequenceDetails[i].species;
        var template = `<option value="${i}">${species}</option>`;
        $('#'+ids.speciesSelect).append(template);
    }


    $(`#${ids.positionInput}, #${ids.speciesSelect}`).on("keyup", function() {
        positionKeyUpCallback();
    });
}

MSAViewer.prototype.loadDivsInViewport = function(reset) {

    var ids  = this.ids;
    loadedPositions = this.loadedPositions;
    processedSequences = this.msa.processedSequences;
    variationNotes  = this.variationNotes;
    ptmNotes = this.ptmNotes;
    if(reset == true){
        for(var i in loadedPositions){
            loadedPositions[i] = false;
        }
        $('#'+ids.sequence).find('section div').remove();
    }  
    var viewportOffset = document.getElementById(ids.sequence).getBoundingClientRect();

    var aminoacid_index = 0;
   
    startX = parseInt((Math.abs(viewportOffset.left) - document.getElementById(ids.nameContainer).clientWidth)/20 - window.innerWidth/40) ;
    if(startX < 0){
      startX = 0;
    }
    endX = parseInt(startX+(document.getElementById(ids.nameContainer).clientWidth)/20 + 3*window.innerWidth/40 + 20) ;
    
    if(processedSequences[0].length <= endX) {
      endX = processedSequences[0].length-1;
    }

    
    for(j = 0; j < processedSequences.length; j++){
      seq1 = processedSequences[j];
       var documentFragment = document.createDocumentFragment();
      for (i = startX; i < endX; i++) {

        if(loadedPositions[i] && seq1.length < 5000){
            continue;
        }
        let aaBox = document.createElement("div");
        //reading protein sequence letter by letter
        var aaLetter = seq1.charAt(i);
        //creating amino acid boxes
        
        if(aaLetter != '-'){
            aminoacid_index+= 1;
            
            aaBox.className = "i-"+i;  
        }
        if(aaLetter == '-'){
          continue;
        }

        if(j in variationNotes && viewportToAANumber[j][i] != -1 && viewportToAANumber[j][i] in variationNotes[j]){
           aaBox.className += " specialAa";
           aaBox.setAttribute('data-sid', j);
        }

        if(j == 0 && viewportToAANumber[j][i] != -1 && viewportToAANumber[j][i] in ptmNotes){
           aaBox.className += " ptm";
           aaBox.setAttribute('data-sid', j);
        }

        aaBox.innerHTML = aaLetter;
        aaBox.style.cssText  = 'left:'+(i*20)+'px;';
        
        // Color schema for amino acids
        colorSchemas = {
            "hydrophobicity": { A: "#ad0052", B: "#0c00f3", C: "#c2003d", D: "#0c00f3", E: "#0c00f3", F: "#cb0034", G: "#6a0095", H: "#1500ea", I: "#ff0000", J: "#fff", K: "#0000ff", L: "#ea0015", M: "#b0004f", N: "#0c00f3", O: "#fff", P: "#4600b9", Q: "#0c00f3", R: "#0000ff", S: "#5e00a1", T: "#61009e", U: "#fff", V: "#f60009", W: "#5b00a4", X: "#680097", Y: "#4f00b0", Z: "#0c00f3" },
            "buried": {A: "#00a35c", R: "#00fc03", N: "#00eb14", D: "#00eb14", C: "#0000ff", Q: "#00f10e", E: "#00f10e", G: "#009d62", H: "#00d52a", I: "#0054ab", L: "#007b84", K: "#00ff00", M: "#009768", F: "#008778", P: "#00e01f", S: "#00d52a", T: "#00db24", W: "#00a857", Y: "#00e619", V: "#005fa0", B: "#00eb14", X: "#00b649", Z: "#00f10e"},
            "cinema": {A: "#BBBBBB", B: "grey", C: "yellow", D: "red", E: "red", F: "magenta", G: "brown", H: "#00FFFF", I: "#BBBBBB", J: "#fff", K: "#00FFFF", L: "#BBBBBB", M: "#BBBBBB", N: "green", O: "#fff", P: "brown", Q: "green", R: "#00FFFF", S: "green", T: "green", U: "#fff", V: "#BBBBBB", W: "magenta", X: "grey", Y: "magenta", Z: "grey"},
            "clustal": {A: "orange", B: "#fff", C: "green", D: "red", E: "red", F: "blue", G: "orange", H: "red", I: "green", J: "#fff", K: "red", L: "green", M: "green", N: "#fff", O: "#fff", P: "orange", Q: "#fff", R: "red", S: "orange", T: "orange", U: "#fff", V: "green", W: "blue", X: "#fff", Y: "blue", Z: "#fff"},
            "clustal2": {A: "#80a0f0", R: "#f01505", N: "#00ff00", D: "#c048c0", C: "#f08080", Q: "#00ff00", E: "#c048c0", G: "#f09048", H: "#15a4a4", I: "#80a0f0", L: "#80a0f0", K: "#f01505", M: "#80a0f0", F: "#80a0f0", P: "#ffff00", S: "#00ff00", T: "#00ff00", W: "#80a0f0", Y: "#15a4a4", V: "#80a0f0", B: "#fff", X: "#fff", Z: "#fff"},
            "helix": {A: "#e718e7", R: "#6f906f", N: "#1be41b", D: "#778877", C: "#23dc23", Q: "#926d92", E: "#ff00ff", G: "#00ff00", H: "#758a75", I: "#8a758a", L: "#ae51ae", K: "#a05fa0", M: "#ef10ef", F: "#986798", P: "#00ff00", S: "#36c936", T: "#47b847", W: "#8a758a", Y: "#21de21", V: "#857a85", B: "#49b649", X: "#758a75", Z: "#c936c9"},
            "lesk": {A: " orange", B: " #fff", C: " green", D: " red", E: " red", F: " green", G: " orange", H: " magenta", I: " green", J: " #fff", K: " red", L: " green", M: " green", N: " magenta", O: " #fff", P: " green", Q: " magenta", R: " red", S: " orange", T: " orange", U: " #fff", V: " green", W: " green", X: " #fff", Y: " green", Z: " #fff"},
            "mae": {A: " #77dd88", B: " #fff", C: " #99ee66", D: " #55bb33", E: " #55bb33", F: " #9999ff", G: " #77dd88", H: " #5555ff", I: " #66bbff", J: " #fff", K: " #ffcc77", L: " #66bbff", M: " #66bbff", N: " #55bb33", O: " #fff", P: " #eeaaaa", Q: " #55bb33", R: " #ffcc77", S: " #ff4455", T: " #ff4455", U: " #fff", V: " #66bbff", W: " #9999ff", X: " #fff", Y: " #9999ff", Z: " #fff"},
            "strand": {A: "#5858a7", R: "#6b6b94", N: "#64649b", D: "#2121de", C: "#9d9d62", Q: "#8c8c73", E: "#0000ff", G: "#4949b6", H: "#60609f", I: "#ecec13", L: "#b2b24d", K: "#4747b8", M: "#82827d", F: "#c2c23d", P: "#2323dc", S: "#4949b6", T: "#9d9d62", W: "#c0c03f", Y: "#d3d32c", V: "#ffff00", B: "#4343bc", X: "#797986", Z: "#4747b8"},
            "taylor": {A: "#ccff00", R: "#0000ff", N: "#cc00ff", D: "#ff0000", C: "#ffff00", Q: "#ff00cc", E: "#ff0066", G: "#ff9900", H: "#0066ff", I: "#66ff00", L: "#33ff00", K: "#6600ff", M: "#00ff00", F: "#00ff66", P: "#ffcc00", S: "#ff3300", T: "#ff6600", W: "#00ccff", Y: "#00ffcc", V: "#99ff00", B: "#fff", X: "#fff", Z: "#fff"},
            "turn": {A: "#2cd3d3", R: "#708f8f", N: "#ff0000", D: "#e81717", C: "#a85757", Q: "#3fc0c0", E: "#778888", G: "#ff0000", H: "#708f8f", I: "#00ffff", L: "#1ce3e3", K: "#7e8181", M: "#1ee1e1", F: "#1ee1e1", P: "#f60909", S: "#e11e1e", T: "#738c8c", W: "#738c8c", Y: "#9d6262", V: "#07f8f8", B: "#f30c0c", X: "#7c8383", Z: "#5ba4a4"},
            "zappo": {A: "#ffafaf", R: "#6464ff", N: "#00ff00", D: "#ff0000", C: "#ffff00", Q: "#00ff00", E: "#ff0000", G: "#ff00ff", H: "#6464ff", I: "#ffafaf", L: "#ffafaf", K: "#6464ff", M: "#ffafaf", F: "#ffc800", P: "#ff00ff", S: "#00ff00", T: "#00ff00", W: "#ffc800", Y: "#ffc800", V: "#ffafaf", B: "#fff", X: "#fff", Z: "#fff"},
            "nucleotide": { A: " #64F73F", C: " #FFB340", G: " #EB413C", T: " #3C88EE", U: " #3C88EE" }
        }
        var aaColor = colorSchemas[colorSchema][aaLetter]
        aaBox.style.backgroundColor += aaColor;
        // Special cases for color schema
        if ((aaColor == "#fff") || (aaColor == "yellow")) {aaBox.style.color += "#555"};
        // Consensus
        if ((aaLetter == ".") || (aaLetter == ":")) {aaBox.style.backgroundColor += "#5c5c5c"};

        documentFragment.appendChild(aaBox);
        aaBox = null;
    }
        let element = document.getElementById(this.id).getElementsByClassName('protein')[j];
        if(seq1.length >= 5000){
          element.innerHTML = '';  
        }
        element.appendChild(documentFragment);
        documentFragment.innerHTML='';
    }
    
    for(i = 0; i < seq1.length; i++){
      if(i >= startX && i < endX)
        loadedPositions[i] = true;
      else if(seq1.length >= 5000)
        loadedPositions[i] = false;
    }  

}

MSAViewer.prototype.addDomains = function(domains) {
    var ids = this.ids;
    for (var key in domains){
        domain_id = domains[key]["domain_id"];
        domain_name = domains[key]["domain_id"];
        domain_external_link = domains[key]["domain_external_link"];
        domain_start_point = domains[key]["domain_start_point"];
        domain_end_point = domains[key]["domain_end_point"];

        domain_template = `
        <a href="${domain_external_link}" target="_blank">
            <div class="domain" data-start-point="${domain_start_point}" data-end-point="${domain_end_point}">
                <div class="domain_start_point">${domain_start_point}</div>
                <p>${domain_name} (${domain_start_point} - ${domain_end_point})</p>
                <div class="domain_end_point">${domain_end_point}</div>
            </div>
        </a>
        `;

        $('#' + ids.proteinLength).append(domain_template);
    };
}

MSAViewer.prototype.addVariation = function(protein, aminoacid, variationNote, source) {
    var protein = protein - 1; // the species start from 0
    let aaNumber = aminoacid - 1; // the aacids start from 0

    notesByProtein = this.variationNotes[protein];
    if (notesByProtein == undefined) {
        notesByProtein = [];
    }

    if (notesByProtein[aaNumber] == undefined) {
        notesByProtein[aaNumber] = {};
        notesByProtein[aaNumber][source] = "";
    } else if (notesByProtein[aaNumber][source] == undefined) {
        notesByProtein[aaNumber][source] = "";
    }

    notesByProtein[aaNumber][source] += "<br>" + variationNote;
    this.variationNotes[protein] = notesByProtein

    if (source == "PTM") {
        this.ptmNotes[aaNumber] += aminoacid + 1;
    }
}

MSAViewer.prototype.scrollIfNeeded = function(element, container) {

    const halfClientWidth = container.clientWidth / 2;
    if (element.offsetLeft < container.scrollLeft-200) {
      container.scrollLeft = element.offsetLeft - halfClientWidth;
    } else {
      const offsetRight = element.offsetLeft + element.offsetWidth;
      const scrollRight = container.scrollLeft + container.offsetWidth;
      if (offsetRight+200 > scrollRight) {
        container.scrollLeft = offsetRight - halfClientWidth;
      }
    }
}

