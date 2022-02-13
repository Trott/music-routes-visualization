/* global d3 */
'use strict'
const id = window.location.search.substring(1).replace(/\W/g, '') || '1765'
d3.json('data/' + id + '.json').then(function (links) {
  const wrap = function (text, width, options) {
    options = options || {}
    options.x = options.x || 0
    options.mody = options.mody || false // whether or not to scoot text up (modify the y) with each line wrapped
    text.each(function () {
      const text = d3.select(this)
      const words = text.text().split(/\s+/).reverse()
      let word
      let line = []
      let y = text.attr('y')
      let tspan = text.text(null).append('tspan').attr('x', options.x)

      while (words.length) {
        word = words.pop()
        line.push(word)
        tspan.text(line.join(' '))
        if (tspan.node().getComputedTextLength() > width && line.length > 1) {
          if (options.mody) {
            y = y - 10
          }
          text.attr('y', y)
          line.pop()
          tspan.text(line.join(' '))
          line = [word]
          tspan = text.append('tspan').attr('x', options.x).attr('dy', 18).text(word)
        }
      }
    })
  }

  const transform = function (d) {
    return 'translate(' + d.x + ',' + d.y + ')'
  }

  const textTransform = function (d) {
    const y = d.y + 8
    return 'translate(' + d.x + ',' + y + ')'
  }

  const tick = function () {
    nodes.attr('transform', transform)
    text.attr('transform', textTransform)
  }

  const zoom = function () {
    svg.attr('transform', 'translate(' + d3.event.transform.x + ',' + d3.event.transform.y + ')scale(' + d3.event.transform.k + ')')
  }

  const vertices = [{ name: links.source, trackCount: links.trackCount, targetId: id }].concat(links.targets)
  vertices.forEach(function (link, index) {
    link.source = vertices[0]
    link.target = vertices[index]
  })

  const linkCount = links.targets.length

  const width = window.innerWidth || 960
  const height = window.innerHeight || 500

  const forceLink = d3.forceLink(vertices)
  forceLink.distance(linkCount < 128 ? 128 : linkCount)
  const simulation = d3.forceSimulation()
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('charge', d3.forceManyBody()
      .strength(linkCount < 256 ? 256 * -16 : linkCount * -16))
    .force('link', forceLink)
    .nodes(vertices)
    .on('tick', tick)

  const svg = d3.select('.visualization').append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .call(d3.zoom().scaleExtent([0.12, 16]).on('zoom', zoom))
    .append('g')

  // background
  svg.append('circle')
    .attr('r', 2048)
    .attr('cx', width / 2)
    .attr('cy', height / 2)
    .attr('fill', '#ddd')
    .attr('stroke', 'none')

  const showDiscography = function (datum) {
    const isSource = datum.name === links.source

    d3.select('.visualization').style('display', 'none')

    // x for closing
    const container = d3.select('.discography')

    const h1 = container.append('h1')
    if (isSource) {
      h1.text(links.source + ' tracks')
    } else {
      h1.append('span').text(links.source + '/' + datum.name + ' tracks')
    }

    container.append('button')
      .attr('class', 'control left')
      .text('Go back to ' + links.source)
      .on('click', function () {
        if (d3.event.defaultPrevented) {
          return
        }

        d3.select('.visualization').style('display', null)
        d3.select('.discography').html('')
      })

    if (!isSource) {
      container.append('button')
        .attr('class', 'control right')
        .text('Go ahead to ' + datum.name)
        .on('click', function () {
          if (d3.event.defaultPrevented) {
            return
          }

          window.location = '?' + datum.targetId
        })
    }

    const table = container.append('table')
    table.style('border-collapse', 'collapse')
    let row = table.append('tr')
    row.append('th').text('Track').style('border', '1px solid')
    row.append('th').text('Artist').style('border', '1px solid')
    row.append('th').text('Release').style('border', '1px solid')

    let tracks
    if (isSource) {
      tracks = links.tracks
    } else {
      tracks = links.tracks.filter(function (elem) {
        return datum.tracks.indexOf(elem._id) !== -1
      })
    }

    for (let i = 0, l = tracks.length; i < l; i++) {
      row = table.append('tr')
      const track = tracks[i]
      // TODO: append each name etc. separated by semi-colons
      row.append('td').text('"' + track.names[0] + '"')
      row.append('td').text(track.artists[0].names[0])
      row.append('td').text(track.releases[0].names[0]).style('font-style', 'italic')
    }

    table.selectAll('td')
      .style('border', '1px solid')
      .style('text-align', 'left')
      .style('padding', '0.5em')
  }

  const showDetails = function (datum) {
    if (d3.event.defaultPrevented) {
      return
    }

    showDiscography(datum)
  }

  const nodes = svg.append('g').selectAll('.node')
    .data(simulation.nodes())
    .enter().append('circle')
    .attr('r', 64)
    .attr('class', 'node')
    .on('click', showDetails)

  const text = svg.append('g').selectAll('text')
    .data(simulation.nodes())
    .enter().append('text')
    .attr('class', 'name')
    .attr('text-anchor', 'middle')
    .text(function (d) { return d.name })
    .call(wrap, 112, { mody: true })

  d3.select('#progress').remove()
}).catch(function (error) {
  d3.select('.visualization').remove()
  const body = d3.select('body')
  body.append('p').text('Something went wrong.')
  body.append('p').text('Check your network connection and reload the page.')
  body.append('p').text('If the problem persists, you can email rtrott@gmail.com and I\'ll try to fix it.')
  body.append('p').text('If you do that, please include as much detail as you can:')
  const ul = body.append('ul')
  ul.append('li').text('what you did leading up to the problem')
  ul.append('li').text('the current URL of this page')
  ul.append('li').text('anything else you might think would be relevant')
  body.append('p').text('Thanks!')
  console.log(error)
})
