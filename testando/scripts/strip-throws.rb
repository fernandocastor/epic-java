#!/usr/bin/ruby

f = File.open(ARGV[0])
text = f.read
f.close

i = 0

removed = 0

def skip_str(text, i)
  #"()<>@,;:\\\"/[]?={} \t"
  while true
    if text[i].chr == '\\'
      esc = 0
      while text[i].chr == '\\'
        esc += 1
        i += 1
      end
      # puts "esc:" + esc.to_s
      if text[i].chr == '"' and esc % 2 == 0
        # puts "returning i esc"
        return i
      end
    elsif text[i].chr == '"'
      return i
    end
    i += 1
  end
end

while i < text.size
  # // and /* might be inside strings
  # if text[i].chr == '"' then
  #   if text[i-1] != "'"
  #     # puts "{" + text.slice(i, 10) + "}"
  #     x = skip_str(text, i+1)
  #     # puts "[[" + text.slice(i, x-i+1) + "]]"
  #     i = x
  #   end
  # end

  if text[i].chr == '/' then
    if text[i+1].chr == '/' then
      # puts "single comment on " + i.to_s
      i = text.index("\n", i)
      # puts "--> resuming at " + i.to_s
    elsif text[i+1].chr == '*' then
      # puts "multi comment on " + i.to_s
      i = text.index('*/', i+2)
      # puts "--> resuming at " + i.to_s
    end
  end

  if i.nil?
    break
  end

  r = text.index(/\)\s*throws\s+[^\{;]+[\{;]/, i)
  if (not r.nil?) and r  == i then
#    puts "found throws at " + i.to_s
#    puts "[[" + text.slice(i+1..text.index('{',i)-1) + "]]"
    text.slice!(i+1..text.index(/[\{;]/,i)-1)
    removed += 1
  else
    i = i + 1
  end
end

f = File.open(ARGV[0],"w")
f.write(text)
f.close
exit(removed)
