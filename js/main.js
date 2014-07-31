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
        tspan = text.text(null).append('tspan').attr('x', 0);
      
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

  var nodes = svg.append('g').selectAll('.node')
      .data(force.nodes())
    .enter().append('circle')
      .attr('r', 64)
      .attr('class', 'node')
      .on('click', function (datum) {
        if (d3.event.defaultPrevented) {
          return;
        }
        var transform = d3.transform(d3.select(this).attr('transform')).translate;
        var width = 320;
        var height = 320;
        var x = transform[0] - width/2;
        var y = transform[1] - height/2;
        var parent = d3.select(this.parentNode.parentNode);
        
        var container = parent.append('rect')
          .attr('width', width)
          .attr('height', height)
          .attr('x', x)
          .attr('y', y)
          .attr('class', 'more-info');

        // x for closing  
        parent.append('text')
          .attr('text-anchor', 'middle')
          .attr('class', 'control')
          .attr('dx', x + width - 16)
          .attr('dy', y + 32)
          .text('☓')
          .on('click', function () {
            if (d3.event.defaultPrevented) {
              return;
            }
            container.remove();
            details.remove();
            name.remove();
            d3.select(this).remove();
          });
        var name = parent.append('svg:a')
          .attr('xlink:href', function() { return '?' + datum.targetId;})
          .append('text')
            .attr('class', 'details hyperlink')
            .attr('dx', x + 8)
            .attr('dy', y + 32)
            .text(datum.name);
        var detailsText = '';
        if (links.source !== datum.name) {
          detailsText = 'recorded with ' + links.source + ' on ';
        }
        detailsText += datum.trackCount + ' track' + (datum.trackCount > 1 ? 's' : '');

        if (links.source !== datum.name) {
          var commonTrackId = datum.tracks[0];

          var track = links.tracks.filter(function (elem) {
            return elem._id === commonTrackId;
          }).pop();

          detailsText += ' including "' + track.names[0] + '"';
          detailsText += ' by ' + track.artists[0].names[0];
          detailsText += ' from the release _' + track.releases[0].names[0] + '_';
        }

        var details = parent.append('text')
            .attr('class', 'details')
            .attr('dx', x + 16)
            .attr('dy', y + 64)
            .text(detailsText)
            .call(wrap, 303, {x: x + 16});
      });

  var text = svg.append('g').selectAll('text')
      .data(force.nodes())
    .enter().append('text')
      .attr('class', 'name')
      .attr('text-anchor', 'middle')
      .text(function (d) { return d.name; })
      .call(wrap, 112, {mody: true});

  d3.select('#progress').remove();
});