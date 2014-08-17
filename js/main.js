/* global window */
/* global d3 */
var id = window.location.search.substring(1).replace(/\W/g, '') || '1';
d3.json('data/' + id + '.json', function (error, links) {
  if (error) {
    d3.select('.visualization').remove();
    var body = d3.select('body');
    body.append('p').text('Something went wrong.');
    body.append('p').text('Check your network connection and reload the page.');
    body.append('p').text('If the problem persists, you can email rtrott@gmail.com and I\'ll try to fix it.');
    body.append('p').text('If you do that, please include as much detail as you can:');
    var ul = body.append('ul');
    ul.append('li').text('what you did leading up to the problem');
    ul.append('li').text('the current URL of this page');
    ul.append('li').text('anything else you might think would be relevant');
    body.append('p').text('Thanks!');
    return error;
  }

  var wrap = function (text, width, options) {
    options = options || {};
    options.x = options.x || 0;
    options.mody = options.mody || false; // whether or not to scoot text up (modify the y) with each line wrapped
    text.each(function() {
      var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        y = text.attr('y'),
        tspan = text.text(null).append('tspan').attr('x', options.x);
      
      while (words.length) {
        word = words.pop();
        line.push(word);
        tspan.text(line.join(' '));
        if (tspan.node().getComputedTextLength() > width && line.length > 1) {
          if (options.mody) {
            y = y-10;
          }
          text.attr('y', y);
          line.pop();
          tspan.text(line.join(' '));
          line = [word];
          tspan = text.append('tspan').attr('x', options.x).attr('dy', 18).text(word);
        }
      }
    });
  };

  var transform = function (d) {
    return 'translate(' + d.x + ',' + d.y + ')';
  };

  var textTransform = function (d) {
    var y = d.y + 8;
    return 'translate(' + d.x + ',' + y + ')';
  };

  var tick = function () {
    nodes.attr('transform', transform);
    text.attr('transform', textTransform);
  };

  var zoom = function () {
    svg.attr('transform', 'translate(' + d3.event.translate + ')scale(' + d3.event.scale + ')');
  };

  var vertices = [{name: links.source, trackCount: links.trackCount, targetId: id}].concat(links.targets);

  links.targets.forEach(function(link, index) {
    link.source = vertices[0];
    link.target = vertices[index+1];
  });

  var linkCount = links.targets.length;

  var width = window.innerWidth || 960,
      height = window.innerHeight || 500;

  var force = d3.layout.force()
    .nodes(d3.values(vertices))
    .links(links.targets)
    .size([width, height])
    .linkDistance(function () {
      return linkCount < 128 ? 128 : linkCount;
    })
    .charge(function () {
      return linkCount < 256 ? 256 * -16 : linkCount * -16;
    })
    .on('tick', tick)
    .start();

  var svg = d3.select('.visualization').append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .call(d3.behavior.zoom().scaleExtent([0.12, 16]).on('zoom', zoom))
    .append('g');

  // background
  svg.append('circle')
    .attr('r', 2048)
    .attr('cx', width/2)
    .attr('cy', height/2)
    .attr('fill', '#ddd')
    .attr('stroke', 'none');

  var showDiscography = function (datum) {
    var isSource = datum.name === links.source;

    d3.select('.visualization').style({display: 'none'});

    // x for closing
    var container = d3.select('.discography');
    container.append('button')
      .attr('class', 'control')
      .text('☓')
      .on('click', function () {
        if (d3.event.defaultPrevented) {
          return;
        }

        d3.select('.visualization').style({display: null});
        d3.select('.discography').html('');
      });

    var h1 = container.append('h1');
    if (isSource) {
      h1.text(datum.name + ' tracks');
    } else {
      h1.append('a').attr('href', '?' + datum.targetId).text(datum.name);
      h1.append('span').text('/' + links.source + ' tracks');
    }
    var table = container.append('table').style({'border-collapse': 'collapse'});
    var row = table.append('tr');
    row.append('th').text('Track').style('border', '1px solid');
    row.append('th').text('Artist').style('border', '1px solid');
    row.append('th').text('Release').style('border', '1px solid');
    
    var tracks;
    if (isSource) {
      tracks = links.tracks;
    } else {
      tracks = links.tracks.filter( function (elem) {
        return datum.tracks.indexOf(elem._id) !== -1;
      });
    }

    for (var i=0, l=tracks.length; i<l; i++) {
      row = table.append('tr');
      var track = tracks[i];
      // TODO: append each name etc. separated by semi-colons
      row.append('td').text('"' + track.names[0] + '"');
      row.append('td').text(track.artists[0].names[0]);
      row.append('td').text(track.releases[0].names[0]).style('font-style', 'italic');
    }
    
    table.selectAll('td').style({border: '1px solid', 'text-align': 'left', padding: '0.5em'});
  };

  var showDetails = function (datum) {

    if (d3.event.defaultPrevented) {
      return;
    }

    showDiscography(datum);
  };

  var nodes = svg.append('g').selectAll('.node')
      .data(force.nodes())
    .enter().append('circle')
      .attr('r', 64)
      .attr('class', 'node')
      .on('click', showDetails);

  var text = svg.append('g').selectAll('text')
      .data(force.nodes())
    .enter().append('text')
      .attr('class', 'name')
      .attr('text-anchor', 'middle')
      .text(function (d) { return d.name; })
      .call(wrap, 112, {mody: true});

  d3.select('#progress').remove();
});