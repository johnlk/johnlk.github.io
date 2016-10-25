//https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat

//https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat

var countries = {
    
};

var flights = new Array(67664);

$.get('https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat', function(data){
    var holder = data.split('\n');
    var line;
    var subArray = [];
    for(var i = 0; i < holder.length; i++){
        line = holder[i].split(',');
        subArray = new Array(2);
        subArray[0] = line[2];
        subArray[1] = line[4];
        flights[i] = subArray;
    }
    //console.log(flights[500]);
    //console.log(countFlights('ATL'));
});


//console.log(countFlights('GKA'));

function countFlights(airportAbriviation){
    var sum = 0;
    for(var i = 0; i < flights.length; i++){
        if(flights[i][0] == airportAbriviation){
            sum++;
        }
        if(flights[i][1] == airportAbriviation){
            sum++;
        }
    }
    return sum;
}

function getColor(country){
    if(countries[country] == undefined){
        countries[country] = Math.floor(Math.random() * 20) + 1;
    }
    return countries[country];
}

//busiest airpot ATL, flights 1826 per day, this will be max

$.get('https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat', function(data) {
    var arr = data.split('\n');
    var line;    
    
    setTimeout(function(){
        document.write('[');
        //for(var i = 0; i < 100; i++){
        for(var i = 0; i < arr.length-1; i++){
            line = arr[i].split(',');
            document.write(line[6] + ',');
            document.write(line[7] + ',');
            document.write(((countFlights(line[4].substring(1, line[4].length-1))/3652) + 0.001).toFixed(6) + ',');
            document.write(getColor(line[3].substring(1, line[3].length-1)));
            //if(i < 99){
            if(i < arr.length - 2){
                document.write(',');
            }
        }
        document.write(']');
        console.log(countries);
    },10); 
    
});