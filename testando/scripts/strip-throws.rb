#!/usr/bin/ruby

text = File.open(ARGV[0]).read
i = 0

while i < text.size
  if text[i].chr == '/' then
    if text[i+1].chr == '/' then
#      puts "single comment on " + i.to_s
      i = text.index("\n", i)
#      puts "--> resuming at " + i.to_s
    elsif text[i+1].chr == '*' then
#      puts "multi comment on " + i.to_s
      i = text.index('*/', i+2)
#      puts "--> resuming at " + i.to_s
    end
  end
  if text.index(/\)\s*throws\s+[^\{;]+[\{;]/, i) == i then
#    puts "found throws at " + i.to_s
#    puts "[[" + text.slice(i+1..text.index('{',i)-1) + "]]"
    text.slice!(i+1..text.index(/[\{;]/,i)-1)
  else
    i = i + 1
  end
end

puts text
